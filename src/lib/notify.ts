import { backend } from "./backend";
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

type TextInput = Pick<NotifyInput, "kind" | "action" | "docTitle" | "byName" | "byRole">;

/** Notification text in both languages (push messages show both). */
export function notificationText(n: TextInput) {
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
 * Send an in-app notification to every active user in the given roles,
 * then a phone/desktop push (best effort).
 */
export async function notifyRoles(n: NotifyInput) {
  const uids = (await backend.activeUserIds(n.roles)).filter((u) => u !== n.byUid);
  if (!uids.length) return;

  await backend.addNotifications(uids, {
    kind: n.kind,
    action: n.action,
    docId: n.docId,
    docTitle: n.docTitle,
    byName: n.byName,
    byRole: n.byRole,
    note: n.note,
    read: false,
    createdAt: Date.now(),
  });

  const text = notificationText(n);
  backend
    .sendPush(uids, {
      title: text.en,
      body: n.note ? `${text.si}\n“${n.note}”` : text.si,
      link: docLink(n.kind, n.docId),
    })
    .catch(() => {});
}
