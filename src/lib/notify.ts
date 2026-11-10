import { backend } from "./backend";
import { translate } from "./i18n";
import { docLink, type AnyAction, type NotifKind, type Role } from "./types";

interface NotifyInput {
  roles: Role[];
  kind: NotifKind;
  action: AnyAction;
  docId: string;
  docTitle: string;
  byName: string;
  byRole: Role;
  byUid: string;
  note: string;
}

type TextInput = Pick<NotifyInput, "kind" | "action" | "docTitle" | "byName" | "byRole">;

/** One-line Sinhala text for a notification. */
export function notificationText(n: TextInput) {
  const key = n.kind === "po" ? "notif.msg.po" : n.kind === "supply" ? "notif.msg.supply" : "notif.msg.transfer";
  return translate(key, {
    by: n.byName,
    role: translate(`role.${n.byRole}`),
    did: translate(`did.${n.action}`),
    title: n.docTitle,
  });
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

  backend
    .sendPush(uids, {
      title: translate("appName"),
      body: n.note ? `${notificationText(n)}\n“${n.note}”` : notificationText(n),
      link: docLink(n.kind, n.docId),
    })
    .catch(() => {});
}
