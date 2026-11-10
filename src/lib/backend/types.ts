import type {
  AppNotification,
  DocKind,
  HistoryEntry,
  Recipe,
  Role,
  SupplyList,
  TransferOut,
  UserProfile,
} from "../types";

/**
 * Everything the UI needs from a backend. The UI only talks to this
 * interface, so the database can be swapped without
 * touching any page or component.
 */

export type Unsub = () => void;

export type DocOf<K extends DocKind> = K extends "supply" ? SupplyList : TransferOut;

export interface AuthSnapshot {
  status: "loading" | "signedOut" | "noProfile" | "ready";
  profile: UserProfile | null;
}

export type PushState = "unsupported" | "default" | "granted" | "denied";

export interface PushPayload {
  title: string;
  body: string;
  link: string;
}

export interface Backend {
  name: "supabase" | "demo";

  // auth
  onAuth(cb: (s: AuthSnapshot) => void): Unsub;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  isSetupDone(): Promise<boolean>;
  setupFirstHr(input: { name: string; email: string; password: string }): Promise<void>;

  // users
  watchUsers(cb: (users: UserProfile[]) => void): Unsub;
  createUser(input: { name: string; email: string; password: string; role: Role }): Promise<void>;
  updateUser(uid: string, patch: Partial<Pick<UserProfile, "role" | "active">>): Promise<void>;
  activeUserIds(roles: Role[]): Promise<string[]>;

  // recipes
  watchRecipes(cb: (recipes: Recipe[]) => void, onError?: (e: Error) => void): Unsub;
  saveRecipe(id: string, data: Omit<Recipe, "id">): Promise<void>;
  deleteRecipe(id: string): Promise<void>;
  addRecipes(recipes: Recipe[]): Promise<void>;

  // supply lists & transfer-outs
  watchDocs<K extends DocKind>(kind: K, cb: (docs: DocOf<K>[]) => void, onError?: (e: Error) => void): Unsub;
  watchDoc<K extends DocKind>(kind: K, id: string, cb: (doc: DocOf<K> | null) => void): Unsub;
  watchTransfersFor(supplyId: string, cb: (docs: TransferOut[]) => void): Unsub;
  createDoc<K extends DocKind>(kind: K, data: Omit<DocOf<K>, "id">): Promise<string>;
  updateDoc(kind: DocKind, id: string, changes: Record<string, unknown>, history: HistoryEntry): Promise<void>;

  // notifications
  addNotifications(uids: string[], n: Omit<AppNotification, "id">): Promise<void>;
  watchNotifications(uid: string, cb: (list: AppNotification[]) => void): Unsub;
  markNotificationsRead(uid: string, ids: string[]): Promise<void>;

  // push (phone / desktop, works when the app is closed)
  sendPush(uids: string[], payload: PushPayload): Promise<void>;
  pushState(): Promise<PushState>;
  enablePush(uid: string): Promise<PushState>;
  refreshPush(uid: string): Promise<void>;
}
