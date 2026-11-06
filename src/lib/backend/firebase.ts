import { deleteApp, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { app, auth, db, firebaseConfig, vapidKey } from "../firebase";
import { COLLECTION, type AppNotification, type Recipe, type TransferOut, type UserProfile } from "../types";
import type { Backend, PushState } from "./types";

async function idToken() {
  return auth.currentUser?.getIdToken();
}

async function pushState(): Promise<PushState> {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator))
    return "unsupported";
  if (!(await isSupported().catch(() => false)) || !vapidKey) return "unsupported";
  return Notification.permission as PushState;
}

async function registerToken(uid: string) {
  const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: reg });
  if (!token) return;
  // The server route also removes the token from anyone who used this
  // device before. Fall back to saving it directly.
  try {
    const res = await fetch("/api/push/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await idToken()}` },
      body: JSON.stringify({ token }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && !body.skipped) return;
  } catch {}
  await updateDoc(doc(db, "users", uid), { fcmTokens: arrayUnion(token) });
}

let foregroundSilenced = false;
async function silenceForeground() {
  // In-app toasts already cover messages while the app is open.
  if (foregroundSilenced || !(await isSupported().catch(() => false))) return;
  foregroundSilenced = true;
  onMessage(getMessaging(app), () => {});
}

export const firebaseBackend: Backend = {
  name: "firebase",

  onAuth(cb) {
    let unsubProfile: (() => void) | undefined;
    cb({ status: "loading", profile: null });
    const unsub = onAuthStateChanged(auth, (u) => {
      unsubProfile?.();
      if (!u) return cb({ status: "signedOut", profile: null });
      cb({ status: "loading", profile: null });
      unsubProfile = onSnapshot(
        doc(db, "users", u.uid),
        (snap) =>
          snap.exists()
            ? cb({ status: "ready", profile: { uid: u.uid, ...snap.data() } as UserProfile })
            : cb({ status: "noProfile", profile: null }),
        () => cb({ status: "noProfile", profile: null }),
      );
    });
    return () => {
      unsub();
      unsubProfile?.();
    };
  },

  async signIn(email, password) {
    await signInWithEmailAndPassword(auth, email, password);
  },

  async signOut() {
    await signOut(auth);
  },

  async isSetupDone() {
    return (await getDoc(doc(db, "meta", "setup"))).exists();
  },

  async setupFirstHr({ name, email, password }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const batch = writeBatch(db);
    batch.set(doc(db, "users", cred.user.uid), { name, email, role: "hr", active: true, createdAt: Date.now() });
    batch.set(doc(db, "meta", "setup"), { by: cred.user.uid, at: Date.now() });
    try {
      await batch.commit();
    } catch (err) {
      await deleteUser(cred.user).catch(() => {});
      throw err;
    }
  },

  watchUsers(cb) {
    return onSnapshot(collection(db, "users"), (s) =>
      cb(s.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserProfile)),
    );
  },

  async createUser({ name, email, password, role }) {
    // A second Firebase app creates the account so HR stays signed in.
    const secondary = initializeApp(firebaseConfig, `create-${Date.now()}`);
    try {
      const secAuth = getAuth(secondary);
      const cred = await createUserWithEmailAndPassword(secAuth, email, password);
      await signOut(secAuth);
      await setDoc(doc(db, "users", cred.user.uid), { name, email, role, active: true, createdAt: Date.now() });
    } finally {
      await deleteApp(secondary).catch(() => {});
    }
  },

  async updateUser(uid, patch) {
    await updateDoc(doc(db, "users", uid), patch);
  },

  async activeUserIds(roles) {
    const snap = await getDocs(query(collection(db, "users"), where("role", "in", roles)));
    return snap.docs.filter((d) => d.data().active !== false).map((d) => d.id);
  },

  watchRecipes(cb, onError) {
    return onSnapshot(
      collection(db, "recipes"),
      (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Recipe)),
      (e) => onError?.(e),
    );
  },

  async saveRecipe(id, data) {
    await setDoc(doc(db, "recipes", id), data);
  },

  async deleteRecipe(id) {
    await deleteDoc(doc(db, "recipes", id));
  },

  async addRecipes(recipes) {
    const batch = writeBatch(db);
    for (const { id, ...r } of recipes) batch.set(doc(db, "recipes", id), r);
    await batch.commit();
  },

  watchDocs(kind, cb, onError) {
    const q = query(collection(db, COLLECTION[kind]), orderBy("createdAt", "desc"), limit(200));
    return onSnapshot(
      q,
      (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() })) as never),
      (e) => onError?.(e),
    );
  },

  watchDoc(kind, id, cb) {
    return onSnapshot(
      doc(db, COLLECTION[kind], id),
      (s) => cb(s.exists() ? ({ id: s.id, ...s.data() } as never) : null),
      () => cb(null),
    );
  },

  watchTransfersFor(supplyId, cb) {
    return onSnapshot(query(collection(db, "transferOuts"), where("supplyId", "==", supplyId)), (s) =>
      cb(s.docs.map((d) => ({ id: d.id, ...d.data() }) as TransferOut).sort((a, b) => b.createdAt - a.createdAt)),
    );
  },

  async createDoc(kind, data) {
    return (await addDoc(collection(db, COLLECTION[kind]), data)).id;
  },

  async updateDoc(kind, id, changes, history) {
    await updateDoc(doc(db, COLLECTION[kind], id), { ...changes, history: arrayUnion(history) });
  },

  async addNotifications(uids, n) {
    const batch = writeBatch(db);
    for (const uid of uids) batch.set(doc(collection(db, "users", uid, "notifications")), n);
    await batch.commit();
  },

  watchNotifications(uid, cb) {
    const q = query(collection(db, "users", uid, "notifications"), orderBy("createdAt", "desc"), limit(100));
    silenceForeground();
    return onSnapshot(q, (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification)));
  },

  async markNotificationsRead(uid, ids) {
    const batch = writeBatch(db);
    for (const id of ids) batch.update(doc(db, "users", uid, "notifications", id), { read: true });
    await batch.commit();
  },

  async sendPush(uids, payload) {
    await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await idToken()}` },
      body: JSON.stringify({ uids, ...payload }),
    });
  },

  pushState,

  async enablePush(uid) {
    const state = await pushState();
    if (state === "unsupported") return state;
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return perm as PushState;
    await registerToken(uid);
    return "granted";
  },

  async refreshPush(uid) {
    if ((await pushState()) === "granted") await registerToken(uid).catch(() => {});
  },
};
