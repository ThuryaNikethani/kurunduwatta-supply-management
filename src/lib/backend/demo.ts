import { DEFAULT_INGREDIENTS } from "../default-recipes";
import { MENU, STAFF_MENU } from "../menu";
import { usernameKey } from "../username";
import type {
  OrderHistoryEntry,
  PurchaseOrder,
  StockIssue,
  StockItem,
  StockMove,
  AppNotification,
  DocKind,
  Recipe,
  Role,
  SupplyList,
  TransferOut,
  UserProfile,
} from "../types";
import { isPushOff, setPushOff } from "./push-off";
import type { AuthSnapshot, Backend, PushState } from "./types";

/**
 * Demo backend: everything is stored in this browser (localStorage) so the
 * frontend can be tried without any server. Open two tabs and sign in as
 * different roles to see live notifications between them.
 */

interface DemoUser extends UserProfile {
  password: string;
}

interface State {
  version: number;
  users: DemoUser[];
  recipes: Recipe[];
  supply: SupplyList[];
  transfer: TransferOut[];
  notifications: Record<string, AppNotification[]>;
  stock?: StockItem[];
  moves?: StockMove[];
  issues?: StockIssue[];
  orders?: PurchaseOrder[];
}

const KEY = "kw-demo-v4";
const SESSION = "kw-demo-session";
export const DEMO_PASSWORD = "123456";

export const DEMO_ACCOUNTS: { username: string; role: Role; name: string }[] = [
  { username: "නිමල්", role: "chef", name: "නිමල්" },
  { username: "කමලා", role: "supervisor", name: "කමලා" },
  { username: "sunil", role: "hr", name: "සුනිල්" },
];

/** Older demo data has no usernames: fall back to the name. */
const loginName = (u: DemoUser) => u.username ?? u.name;

function seed(): State {
  const now = Date.now();
  const users: DemoUser[] = DEMO_ACCOUNTS.map((a) => ({
    uid: a.role,
    name: a.name,
    username: a.username,
    email: `${a.role}@demo.lk`,
    role: a.role,
    active: true,
    password: DEMO_PASSWORD,
    createdAt: now,
  }));
  const recipes: Recipe[] = [
    ...MENU.flatMap(({ category, dishes }) =>
      dishes.map(([id, name]) => ({ id, name, category, menu: "guests" as const, ingredients: DEFAULT_INGREDIENTS[id] ?? [], updatedAt: now })),
    ),
    ...STAFF_MENU.flatMap(({ category, dishes }) =>
      dishes.map(([id, name]) => ({ id, name, category, menu: "staff" as const, ingredients: DEFAULT_INGREDIENTS[id] ?? [], updatedAt: now })),
    ),
  ];
  const chef = users[0];
  const sample: SupplyList = {
    id: "demo-1",
    audience: "guests",
    title: "පෙරේරා පවුල – 10 දෙනා",
    eventDate: new Date(now + 86400000).toISOString().slice(0, 10),
    meal: "lunch",
    guestCount: 10,
    dishes: [
      { id: "traditional-sri-lankan-rice-and-curry-set", name: "බත් සහ කරි" },
      { id: "sri-lankan-watalappan", name: "වටලප්පන්" },
    ],
    items: [
      { name: "සම්බා හාල්", unit: "kg", qty: 1.5, calculated: 1.5, note: "" },
      { name: "රතු පරිප්පු", unit: "g", qty: 400, calculated: 400, note: "" },
      { name: "කුකුල් මස්", unit: "kg", qty: 1.5, calculated: 1.2, note: "අමුත්තෝ කුකුල් මස් වැඩිපුර ඉල්ලුවා" },
      { name: "පොල් කිරි", unit: "l", qty: 1.8, calculated: 1.8, note: "" },
      { name: "කිතුල් හකුරු", unit: "g", qty: 400, calculated: 400, note: "" },
      { name: "බිත්තර", unit: "pcs", qty: 10, calculated: 10, note: "" },
    ],
    status: "pending_supervisor",
    history: [{ at: now - 3600000, uid: chef.uid, name: chef.name, role: "chef", action: "submit", note: "" }],
    createdBy: chef.uid,
    createdByName: chef.name,
    createdAt: now - 3600000,
    updatedAt: now - 3600000,
  };
  return { version: 1, users, recipes, supply: [sample], transfer: [], notifications: {} };
}

// ---------------------------------------------------------------- store

let cache: State | null = null;
const listeners = new Set<() => void>();

function load(): State {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) cache = JSON.parse(raw) as State;
  } catch {}
  if (!cache) {
    cache = seed();
    save();
  }
  return cache;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {}
}

function emit() {
  for (const l of [...listeners]) l();
}

function mutate(fn: (s: State) => void) {
  const s = structuredClone(load());
  fn(s);
  cache = s;
  save();
  emit();
}

if (typeof window !== "undefined") {
  // Other tabs changed the data -> refresh this tab live.
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      cache = null;
      emit();
    }
    if (e.key === null) {
      cache = null;
      emit();
    }
  });
}

function watch<T>(select: (s: State) => T, cb: (v: T) => void) {
  let last = "";
  const run = () => {
    const v = select(load());
    const json = JSON.stringify(v);
    if (json === last) return;
    last = json;
    cb(structuredClone(v));
  };
  listeners.add(run);
  setTimeout(run, 0);
  return () => {
    listeners.delete(run);
  };
}

const delay = () => new Promise((r) => setTimeout(r, 150));
const newId = () => Math.random().toString(36).slice(2, 10);

// ---------------------------------------------------------------- auth

let sessionUid: string | null = null;
const authListeners = new Set<() => void>();

function currentSession() {
  if (sessionUid === null) {
    try {
      sessionUid = sessionStorage.getItem(SESSION) ?? "";
    } catch {
      sessionUid = "";
    }
  }
  return sessionUid;
}

function setSession(uid: string) {
  sessionUid = uid;
  try {
    if (uid) sessionStorage.setItem(SESSION, uid);
    else sessionStorage.removeItem(SESSION);
  } catch {}
  for (const l of [...authListeners]) l();
}

function strip(u: DemoUser): UserProfile {
  const { password: _pw, ...rest } = u;
  void _pw;
  return { ...rest, username: loginName(u) };
}

export const demoBackend: Backend = {
  name: "demo",

  onAuth(cb) {
    const run = () => {
      const uid = currentSession();
      if (!uid) return cb({ status: "signedOut", profile: null });
      const u = load().users.find((x) => x.uid === uid);
      const snap: AuthSnapshot = u ? { status: "ready", profile: strip(u) } : { status: "noProfile", profile: null };
      cb(snap);
    };
    authListeners.add(run);
    listeners.add(run);
    setTimeout(run, 0);
    return () => {
      authListeners.delete(run);
      listeners.delete(run);
    };
  },

  async signIn(username, password) {
    await delay();
    const u = load().users.find((x) => usernameKey(loginName(x)) === usernameKey(username));
    if (!u || u.password !== password) throw new Error("auth/invalid-credential");
    setSession(u.uid);
  },

  async signOut() {
    setSession("");
  },

  async isSetupDone() {
    return true;
  },

  async setupFirstHr() {
    throw new Error("already-set-up");
  },

  watchUsers(cb) {
    return watch((s) => s.users.map(strip), cb);
  },

  async createUser({ name, username, password, role }) {
    await delay();
    if (load().users.some((u) => usernameKey(loginName(u)) === usernameKey(username))) throw new Error("username-taken");
    const uid = newId();
    mutate((s) => s.users.push({ uid, name, username, email: `${uid}@demo.lk`, password, role, active: true, createdAt: Date.now() }));
  },

  async resetPassword(uid, password) {
    await delay();
    mutate((s) => {
      const u = s.users.find((x) => x.uid === uid);
      if (u) u.password = password;
    });
  },

  async changeOwnPassword(password) {
    await delay();
    const uid = currentSession();
    mutate((s) => {
      const u = s.users.find((x) => x.uid === uid);
      if (u) u.password = password;
    });
  },

  async updateUser(uid, patch) {
    mutate((s) => {
      const u = s.users.find((x) => x.uid === uid);
      if (u) Object.assign(u, patch);
    });
  },

  async activeUserIds(roles) {
    return load()
      .users.filter((u) => u.active && roles.includes(u.role))
      .map((u) => u.uid);
  },

  watchRecipes(cb) {
    return watch((s) => s.recipes, cb);
  },

  async saveRecipe(id, data) {
    await delay();
    mutate((s) => {
      const i = s.recipes.findIndex((r) => r.id === id);
      if (i >= 0) s.recipes[i] = { id, ...data };
      else s.recipes.push({ id, ...data });
    });
  },

  async deleteRecipe(id) {
    mutate((s) => {
      s.recipes = s.recipes.filter((r) => r.id !== id);
    });
  },

  async addRecipes(recipes) {
    mutate((s) => {
      const have = new Set(s.recipes.map((r) => r.id));
      s.recipes.push(...recipes.filter((r) => !have.has(r.id)));
    });
  },

  watchDocs(kind, cb) {
    return watch((s) => [...(s[kind] as unknown[])].sort(byNewest), cb as (v: unknown[]) => void);
  },

  watchDoc(kind, id, cb) {
    return watch(
      (s) => (s[kind] as { id: string }[]).find((d) => d.id === id) ?? null,
      cb as (v: unknown) => void,
    );
  },

  watchTransfersFor(supplyId, cb) {
    return watch((s) => s.transfer.filter((t) => t.supplyId === supplyId).sort(byNewest), cb);
  },

  async createDoc(kind, data) {
    await delay();
    const id = newId();
    mutate((s) => {
      (s[kind] as unknown[]).push({ id, ...data });
    });
    return id;
  },

  async updateDoc(kind: DocKind, id, changes, history) {
    await delay();
    mutate((s) => {
      const d = (s[kind] as (SupplyList | TransferOut)[]).find((x) => x.id === id);
      if (!d) throw new Error("Not found");
      Object.assign(d, changes);
      d.history = [...d.history, history];
    });
  },

  async addNotifications(uids, n) {
    mutate((s) => {
      for (const uid of uids) s.notifications[uid] = [{ id: newId(), ...n }, ...(s.notifications[uid] ?? [])].slice(0, 100);
    });
  },

  watchNotifications(uid, cb) {
    return watch((s) => s.notifications[uid] ?? [], cb);
  },

  async markNotificationsRead(uid, ids) {
    mutate((s) => {
      for (const n of s.notifications[uid] ?? []) if (ids.includes(n.id)) n.read = true;
    });
  },

  watchStock(cb) {
    return watch((s) => [...(s.stock ?? [])].sort((a, b) => a.name.localeCompare(b.name)), cb);
  },

  watchStockMoves(itemId, cb) {
    return watch((s) => (s.moves ?? []).filter((m) => m.itemId === itemId).sort((a, b) => b.createdAt - a.createdAt), cb);
  },

  async addStockItem({ name, unit, minQty }) {
    await delay();
    const st = load();
    if ((st.stock ?? []).some((i) => i.name.toLowerCase() === name.trim().toLowerCase() && i.unit === unit))
      throw Object.assign(new Error("stock-exists"), { code: "stock-exists" });
    const id = newId();
    mutate((s) => {
      s.stock = [...(s.stock ?? []), { id, name: name.trim(), unit, qty: 0, minQty, updatedAt: Date.now() }];
    });
    return id;
  },

  async updateStockItem(id, patch) {
    mutate((s) => {
      const i = (s.stock ?? []).find((x) => x.id === id);
      if (i) Object.assign(i, patch, { updatedAt: Date.now() });
    });
  },

  async changeStock(itemId, change, note) {
    await delay();
    demoStockChange(itemId, change, "adjust", note);
  },

  watchStockIssue(supplyId, cb) {
    return watch((s) => (s.issues ?? []).find((i) => i.supplyId === supplyId) ?? null, cb);
  },

  async issueSupply(supplyId, lines) {
    await delay();
    const st = load();
    const list = st.supply.find((l) => l.id === supplyId);
    if (!list || list.status !== "approved") throw new Error("only an approved list can be issued");
    if ((st.issues ?? []).some((i) => i.supplyId === supplyId)) throw new Error("already issued");
    for (const l of lines) if (l.itemId && l.qty > 0) demoStockChange(l.itemId, -l.qty, "issue", list.title, "supply", supplyId);
    const me = st.users.find((u) => u.uid === currentSession());
    mutate((s) => {
      s.issues = [...(s.issues ?? []), { supplyId, lines, byName: me?.name ?? "", createdAt: Date.now() }];
    });
  },

  watchOrders(cb) {
    return watch((s) => [...(s.orders ?? [])].sort(byNewest), cb);
  },

  watchOrder(id, cb) {
    return watch((s) => (s.orders ?? []).find((o) => o.id === id) ?? null, cb);
  },

  async createOrder(order) {
    await delay();
    const id = newId();
    mutate((s) => {
      s.orders = [...(s.orders ?? []), { id, ...order }];
    });
    return id;
  },

  async updateOrder(id, changes, entry: OrderHistoryEntry) {
    await delay();
    mutate((s) => {
      const o = (s.orders ?? []).find((x) => x.id === id);
      if (!o) throw new Error("Not found");
      Object.assign(o, changes);
      o.history = [...o.history, entry];
    });
  },

  async receiveOrder(id, lines, entry) {
    await delay();
    const o = (load().orders ?? []).find((x) => x.id === id);
    if (!o || o.status !== "approved") throw new Error("only an approved order can be received");
    for (const l of lines) {
      let itemId = l.itemId;
      if (!itemId) {
        const found = (load().stock ?? []).find((i) => i.name.toLowerCase() === l.name.toLowerCase() && i.unit === l.unit);
        itemId = found?.id ?? (await demoBackend.addStockItem({ name: l.name, unit: l.unit, minQty: 0 }));
      }
      if (l.qty > 0) demoStockChange(itemId, l.qty, "receive", o.supplier, "po", id);
    }
    mutate((s) => {
      const x = (s.orders ?? []).find((y) => y.id === id)!;
      x.status = "received";
      x.history = [...x.history, entry];
      x.updatedAt = Date.now();
    });
  },

  async sendPush() {
    // No server in demo mode; the in-app listener shows system
    // notifications while another tab of the app is open.
  },

  async pushState() {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission as PushState;
  },

  async enablePush(uid) {
    if (!("Notification" in window)) return "unsupported";
    setPushOff(uid, false);
    return (await Notification.requestPermission()) as PushState;
  },

  async refreshPush() {},

  async disablePush(uid) {
    setPushOff(uid, true);
  },

  isPushOff,
};

function demoStockChange(
  itemId: string,
  change: number,
  reason: StockMove["reason"],
  note: string,
  refKind: string | null = null,
  refId: string | null = null,
) {
  const st = load();
  const item = (st.stock ?? []).find((i) => i.id === itemId);
  if (!item) throw new Error("stock item not found");
  const after = Math.round((item.qty + change) * 1000) / 1000;
  if (after < 0) throw new Error("not enough stock");
  const me = st.users.find((u) => u.uid === currentSession());
  mutate((s) => {
    const i = (s.stock ?? []).find((x) => x.id === itemId)!;
    i.qty = after;
    i.updatedAt = Date.now();
    s.moves = [
      ...(s.moves ?? []),
      { id: newId(), itemId, itemName: i.name, unit: i.unit, change, qtyAfter: after, reason, note, refKind, refId, byName: me?.name ?? "", createdAt: Date.now() },
    ];
  });
}

function byNewest(a: unknown, b: unknown) {
  return (b as { createdAt: number }).createdAt - (a as { createdAt: number }).createdAt;
}

/** Wipe demo data and start again with the sample data. */
export function resetDemo() {
  cache = seed();
  save();
  emit();
}
