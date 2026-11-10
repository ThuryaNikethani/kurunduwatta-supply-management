/** Remembers on this device that a user turned their popups off here. */
const key = (uid: string) => `kw-push-off:${uid}`;

export function isPushOff(uid: string) {
  try {
    return localStorage.getItem(key(uid)) === "1";
  } catch {
    return false;
  }
}

export function setPushOff(uid: string, off: boolean) {
  try {
    if (off) localStorage.setItem(key(uid), "1");
    else localStorage.removeItem(key(uid));
  } catch {}
}
