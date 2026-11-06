import { arrayUnion, doc, updateDoc } from "firebase/firestore";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { app, auth, db, vapidKey } from "./firebase";

export type PushState = "unsupported" | "default" | "granted" | "denied";

export async function pushState(): Promise<PushState> {
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
  // Prefer the server route (it also removes the token from anyone who used
  // this device before); fall back to saving it directly.
  try {
    const idToken = await auth.currentUser?.getIdToken();
    const res = await fetch("/api/push/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ token }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && !body.skipped) return;
  } catch {}
  await updateDoc(doc(db, "users", uid), { fcmTokens: arrayUnion(token) });
}

/** Ask permission and register this device for push notifications. */
export async function enablePush(uid: string): Promise<PushState> {
  const state = await pushState();
  if (state === "unsupported") return state;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm as PushState;
  await registerToken(uid);
  return "granted";
}

/** Re-register silently on each visit (tokens can change over time). */
export async function refreshPush(uid: string) {
  if ((await pushState()) === "granted") await registerToken(uid).catch(() => {});
}

/**
 * While the app is open, foreground push messages are ignored because the
 * Firestore listener already shows an in-app toast for the same event.
 */
export async function silenceForegroundPush() {
  if (!(await isSupported().catch(() => false))) return () => {};
  return onMessage(getMessaging(app), () => {});
}
