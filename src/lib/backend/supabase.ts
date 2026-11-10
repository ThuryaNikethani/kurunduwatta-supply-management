import { accessToken, fromRow, supabase, toRow, vapidPublicKey } from "../supabase";
import type {
  AppNotification,
  DocKind,
  PurchaseOrder,
  Recipe,
  StockIssue,
  StockItem,
  StockMove,
  TransferOut,
  UserProfile,
} from "../types";
import { isPushOff, setPushOff } from "./push-off";
import type { AuthSnapshot, Backend, PushState, Unsub } from "./types";

const TABLE: Record<DocKind, string> = { supply: "supply_lists", transfer: "transfer_outs" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = Record<string, unknown>;

function profileFromRow(row: Row): UserProfile {
  const p = fromRow<UserProfile & { id: string }>(row);
  return { uid: p.id, name: p.name, email: p.email, role: p.role, active: p.active, createdAt: p.createdAt };
}

/** PostgREST may return numeric columns as strings. */
const num = (v: unknown) => Number(v ?? 0);
const stockFromRow = (r: Row): StockItem => {
  const s = fromRow<StockItem>(r);
  return { ...s, qty: num(s.qty), minQty: num(s.minQty) };
};

function fail(error: { message: string; code?: string } | null) {
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
}

/**
 * Run `fetcher` now and again whenever `table` changes (Supabase Realtime).
 * Several quick changes are merged into one refresh.
 */
function live<T>(
  table: string,
  fetcher: () => Promise<T>,
  cb: (v: T) => void,
  opts: { filter?: string; onError?: (e: Error) => void } = {},
): Unsub {
  let alive = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = async () => {
    try {
      const v = await fetcher();
      if (alive) cb(v);
    } catch (e) {
      if (alive) opts.onError?.(e as Error);
    }
  };
  run();
  const channel = supabase
    .channel(`${table}:${opts.filter ?? "all"}:${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table, ...(opts.filter ? { filter: opts.filter } : {}) },
      () => {
        clearTimeout(timer);
        timer = setTimeout(run, 150);
      },
    )
    .subscribe();
  return () => {
    alive = false;
    clearTimeout(timer);
    supabase.removeChannel(channel);
  };
}

async function api(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await accessToken()}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? `request failed (${res.status})`), { code: data.code });
  return data;
}

// ---------------------------------------------------------------- push

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function pushState(): Promise<PushState> {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !vapidPublicKey
  )
    return "unsupported";
  return Notification.permission as PushState;
}

/** Subscribe this phone/browser to popups and link it to the signed-in user. */
async function registerDevice() {
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub)
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  await api("/api/push/register", sub.toJSON());
}

// ---------------------------------------------------------------- backend

export const supabaseBackend: Backend = {
  name: "supabase",

  onAuth(cb) {
    let currentUid: string | null | undefined;
    let unsubProfile: Unsub | undefined;
    cb({ status: "loading", profile: null });

    const handle = (uid: string | null) => {
      if (uid === currentUid) return;
      currentUid = uid;
      unsubProfile?.();
      unsubProfile = undefined;
      if (!uid) return cb({ status: "signedOut", profile: null });
      cb({ status: "loading", profile: null });
      unsubProfile = live(
        "profiles",
        async () => {
          const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
          fail(error);
          return data;
        },
        (row): void => {
          const snap: AuthSnapshot = row
            ? { status: "ready", profile: profileFromRow(row) }
            : { status: "noProfile", profile: null };
          cb(snap);
        },
        { filter: `id=eq.${uid}`, onError: () => cb({ status: "noProfile", profile: null }) },
      );
    };

    supabase.auth.getSession().then(({ data }) => handle(data.session?.user.id ?? null));
    // Supabase asks not to call it again inside this callback, so defer.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => handle(session?.user.id ?? null), 0);
    });
    return () => {
      data.subscription.unsubscribe();
      unsubProfile?.();
    };
  },

  async signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    fail(error);
  },

  async signOut() {
    // The device stays registered for popups, so alerts keep coming after logout.
    await supabase.auth.signOut();
  },

  async isSetupDone() {
    const { data, error } = await supabase.from("app_meta").select("key").eq("key", "setup").maybeSingle();
    fail(error);
    return !!data;
  },

  async setupFirstHr(input) {
    await api("/api/setup", input);
    await this.signIn(input.email, input.password);
  },

  watchUsers(cb) {
    return live(
      "profiles",
      async () => {
        const { data, error } = await supabase.from("profiles").select("*").order("name");
        fail(error);
        return (data ?? []).map(profileFromRow);
      },
      cb,
    );
  },

  async createUser(input) {
    await api("/api/users", input);
  },

  async resetPassword(uid, password) {
    await api("/api/users/password", { uid, password });
  },

  async changeOwnPassword(password) {
    const { error } = await supabase.auth.updateUser({ password });
    fail(error);
  },

  async updateUser(uid, patch) {
    const { error } = await supabase.from("profiles").update(patch).eq("id", uid);
    fail(error);
  },

  async activeUserIds(roles) {
    const { data, error } = await supabase.from("profiles").select("id").in("role", roles).eq("active", true);
    fail(error);
    return (data ?? []).map((r) => r.id as string);
  },

  watchRecipes(cb, onError) {
    return live(
      "recipes",
      async () => {
        const { data, error } = await supabase.from("recipes").select("*");
        fail(error);
        return (data ?? []).map((r) => fromRow<Recipe>(r));
      },
      cb,
      { onError },
    );
  },

  async saveRecipe(id, data) {
    const { error } = await supabase.from("recipes").upsert(toRow({ id, ...data }));
    fail(error);
  },

  async deleteRecipe(id) {
    const { error } = await supabase.from("recipes").delete().eq("id", id);
    fail(error);
  },

  async addRecipes(recipes) {
    if (!recipes.length) return;
    const { error } = await supabase
      .from("recipes")
      .upsert(recipes.map((r) => toRow({ ...r })), { onConflict: "id", ignoreDuplicates: true });
    fail(error);
  },

  watchDocs(kind, cb, onError) {
    return live(
      TABLE[kind],
      async () => {
        const { data, error } = await supabase
          .from(TABLE[kind])
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);
        fail(error);
        return (data ?? []).map((r) => fromRow(r)) as never;
      },
      cb,
      { onError },
    );
  },

  watchDoc(kind, id, cb) {
    if (!UUID.test(id)) {
      setTimeout(() => cb(null), 0);
      return () => {};
    }
    return live(
      TABLE[kind],
      async () => {
        const { data, error } = await supabase.from(TABLE[kind]).select("*").eq("id", id).maybeSingle();
        fail(error);
        return data ? (fromRow(data) as never) : null;
      },
      cb,
      { filter: `id=eq.${id}`, onError: () => cb(null) },
    );
  },

  watchTransfersFor(supplyId, cb) {
    if (!UUID.test(supplyId)) {
      setTimeout(() => cb([]), 0);
      return () => {};
    }
    return live(
      "transfer_outs",
      async () => {
        const { data, error } = await supabase
          .from("transfer_outs")
          .select("*")
          .eq("supply_id", supplyId)
          .order("created_at", { ascending: false });
        fail(error);
        return (data ?? []).map((r) => fromRow<TransferOut>(r));
      },
      cb,
      { filter: `supply_id=eq.${supplyId}` },
    );
  },

  async createDoc(kind, data) {
    const { data: row, error } = await supabase
      .from(TABLE[kind])
      .insert(toRow(data as unknown as Row))
      .select("id")
      .single();
    fail(error);
    return row!.id as string;
  },

  async updateDoc(kind, id, changes, history) {
    const { data: cur, error: readError } = await supabase.from(TABLE[kind]).select("history").eq("id", id).single();
    fail(readError);
    const { error } = await supabase
      .from(TABLE[kind])
      .update({ ...toRow(changes), history: [...((cur?.history as unknown[]) ?? []), history] })
      .eq("id", id);
    fail(error);
  },

  async addNotifications(uids, n) {
    if (!uids.length) return;
    const { error } = await supabase.from("notifications").insert(uids.map((uid) => toRow({ userId: uid, ...n })));
    fail(error);
  },

  watchNotifications(uid, cb) {
    return live(
      "notifications",
      async () => {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(100);
        fail(error);
        return (data ?? []).map((r) => fromRow<AppNotification>(r));
      },
      cb,
      { filter: `user_id=eq.${uid}` },
    );
  },

  async markNotificationsRead(_uid, ids) {
    if (!ids.length) return;
    const { error } = await supabase.from("notifications").update({ read: true }).in("id", ids);
    fail(error);
  },

  watchStock(cb) {
    return live(
      "stock_items",
      async () => {
        const { data, error } = await supabase.from("stock_items").select("*").order("name");
        fail(error);
        return (data ?? []).map(stockFromRow);
      },
      cb,
    );
  },

  watchStockMoves(itemId, cb) {
    return live(
      "stock_moves",
      async () => {
        const { data, error } = await supabase
          .from("stock_moves")
          .select("*")
          .eq("item_id", itemId)
          .order("created_at", { ascending: false })
          .limit(100);
        fail(error);
        return (data ?? []).map((r) => {
          const m = fromRow<StockMove>(r);
          return { ...m, change: num(m.change), qtyAfter: num(m.qtyAfter) };
        });
      },
      cb,
      { filter: `item_id=eq.${itemId}` },
    );
  },

  async addStockItem({ name, unit, minQty }) {
    const { data, error } = await supabase
      .from("stock_items")
      .insert({ name: name.trim(), unit, min_qty: minQty, qty: 0, updated_at: Date.now() })
      .select("id")
      .single();
    if (error?.code === "23505") throw Object.assign(new Error("stock-exists"), { code: "stock-exists" });
    fail(error);
    return data!.id as string;
  },

  async updateStockItem(id, patch) {
    const row: Row = { updated_at: Date.now() };
    if (patch.name !== undefined) row.name = patch.name.trim();
    if (patch.unit !== undefined) row.unit = patch.unit;
    if (patch.minQty !== undefined) row.min_qty = patch.minQty;
    const { error } = await supabase.from("stock_items").update(row).eq("id", id);
    if (error?.code === "23505") throw Object.assign(new Error("stock-exists"), { code: "stock-exists" });
    fail(error);
  },

  async changeStock(itemId, change, note) {
    const { error } = await supabase.rpc("stock_change", { p_item: itemId, p_change: change, p_reason: "adjust", p_note: note });
    fail(error);
  },

  watchStockIssue(supplyId, cb) {
    if (!UUID.test(supplyId)) {
      setTimeout(() => cb(null), 0);
      return () => {};
    }
    return live(
      "stock_issues",
      async () => {
        const { data, error } = await supabase.from("stock_issues").select("*").eq("supply_id", supplyId).maybeSingle();
        fail(error);
        return data ? fromRow<StockIssue>(data) : null;
      },
      cb,
      { filter: `supply_id=eq.${supplyId}` },
    );
  },

  async issueSupply(supplyId, lines) {
    const { error } = await supabase.rpc("issue_supply", { p_supply: supplyId, p_lines: lines });
    fail(error);
  },

  watchOrders(cb, onError) {
    return live(
      "purchase_orders",
      async () => {
        const { data, error } = await supabase
          .from("purchase_orders")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);
        fail(error);
        return (data ?? []).map((r) => fromRow<PurchaseOrder>(r));
      },
      cb,
      { onError },
    );
  },

  watchOrder(id, cb) {
    if (!UUID.test(id)) {
      setTimeout(() => cb(null), 0);
      return () => {};
    }
    return live(
      "purchase_orders",
      async () => {
        const { data, error } = await supabase.from("purchase_orders").select("*").eq("id", id).maybeSingle();
        fail(error);
        return data ? fromRow<PurchaseOrder>(data) : null;
      },
      cb,
      { filter: `id=eq.${id}`, onError: () => cb(null) },
    );
  },

  async createOrder(order) {
    const { data, error } = await supabase
      .from("purchase_orders")
      .insert(toRow(order as unknown as Row))
      .select("id")
      .single();
    fail(error);
    return data!.id as string;
  },

  async updateOrder(id, changes, entry) {
    const { data: cur, error: readError } = await supabase.from("purchase_orders").select("history").eq("id", id).single();
    fail(readError);
    const { error } = await supabase
      .from("purchase_orders")
      .update({ ...toRow(changes), history: [...((cur?.history as unknown[]) ?? []), entry] })
      .eq("id", id);
    fail(error);
  },

  async receiveOrder(id, lines, entry) {
    const { error } = await supabase.rpc("receive_order", { p_order: id, p_lines: lines, p_entry: entry });
    fail(error);
  },

  async sendPush(uids, payload) {
    await api("/api/push", { uids, ...payload });
  },

  pushState,

  async enablePush(uid) {
    const state = await pushState();
    if (state === "unsupported") return state;
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return perm as PushState;
    setPushOff(uid, false);
    await registerDevice();
    return "granted";
  },

  async refreshPush(uid) {
    // Everyone who signs in on a device with popups allowed gets them there,
    // unless they turned theirs off on this device.
    if ((await pushState()) === "granted" && !isPushOff(uid)) await registerDevice().catch(() => {});
  },

  async disablePush(uid) {
    setPushOff(uid, true);
    const reg = await navigator.serviceWorker?.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await api("/api/push/unregister", { endpoint: sub.endpoint });
  },

  isPushOff,
};
