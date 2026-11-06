import { collection, doc, getDocs, query, where, writeBatch } from "firebase/firestore";
import { auth, db } from "./firebase";
import { translate } from "./i18n";
import { docLink, type Action, type DocKind, type Role } from "./types";

interface NotifyInput {
  roles: Role[];
  kind: DocKind;
  action: Action;
  docId: string;
  docTitle: string;
  byName: string;
  byRole: Role;
  byUid: string;
  note: string;
}

/** Push text in both languages so every phone can read it. */
export function notificationText(n: Omit<NotifyInput, "roles" | "byUid" | "docId">) {
  const line = (lang: "en" | "si") =>
    translate(lang, n.kind === "supply" ? "notif.msg.supply" : "notif.msg.transfer", {
      by: n.byName,
      role: translate(lang, `role.${n.byRole}`),
      did: translate(lang, `did.${n.action}`),
      title: n.docTitle,
    });
  return { en: line("en"), si: line("si") };
}

/**
 * Write an in-app notification for every active user in the given roles,
 * then ask the server to send a phone/desktop push (if configured).
 */
export async function notifyRoles(n: NotifyInput) {
  const snap = await getDocs(query(collection(db, "users"), where("role", "in", n.roles)));
  const uids = snap.docs
    .filter((d) => d.data().active !== false && d.id !== n.byUid)
    .map((d) => d.id);
  if (!uids.length) return;

  const batch = writeBatch(db);
  const createdAt = Date.now();
  for (const uid of uids) {
    batch.set(doc(collection(db, "users", uid, "notifications")), {
      kind: n.kind,
      action: n.action,
      docId: n.docId,
      docTitle: n.docTitle,
      byName: n.byName,
      byRole: n.byRole,
      note: n.note,
      read: false,
      createdAt,
    });
  }
  await batch.commit();

  try {
    const token = await auth.currentUser?.getIdToken();
    const text = notificationText(n);
    await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        uids,
        title: text.en,
        body: n.note ? `${text.si}\n“${n.note}”` : text.si,
        link: docLink(n.kind, n.docId),
      }),
    });
  } catch {
    // Push is best-effort; in-app notifications already went out.
  }
}
