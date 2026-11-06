import { backend } from "./backend";
import type { DocOf } from "./backend/types";
import { notifyRoles } from "./notify";
import type { Action, DocKind, HistoryEntry, UserProfile } from "./types";
import { NEXT_STATUS, NOTIFY_ROLES } from "./workflow";

function entry(profile: UserProfile, action: Action, note: string): HistoryEntry {
  return { at: Date.now(), uid: profile.uid, name: profile.name, role: profile.role, action, note: note.trim() };
}

type NewDocData<K extends DocKind> = Omit<
  DocOf<K>,
  "id" | "status" | "history" | "createdBy" | "createdByName" | "createdAt" | "updatedAt"
>;

/** Create a new supply list or leftovers record and notify the supervisor. */
export async function createWorkflowDoc<K extends DocKind>(
  kind: K,
  profile: UserProfile,
  data: NewDocData<K>,
  note: string,
) {
  const now = Date.now();
  const id = await backend.createDoc(kind, {
    ...data,
    status: NEXT_STATUS.submit,
    history: [entry(profile, "submit", note)],
    createdBy: profile.uid,
    createdByName: profile.name,
    createdAt: now,
    updatedAt: now,
  } as Omit<DocOf<K>, "id">);
  const d = data as { title?: string; supplyTitle?: string };
  await notifyRoles({
    roles: NOTIFY_ROLES.submit,
    kind,
    action: "submit",
    docId: id,
    docTitle: d.title ?? d.supplyTitle ?? "",
    byName: profile.name,
    byRole: profile.role,
    byUid: profile.uid,
    note: note.trim(),
  });
  return id;
}

/** Move a document to its next step, record history and notify. */
export async function performAction(
  kind: DocKind,
  id: string,
  title: string,
  profile: UserProfile,
  action: Action,
  note: string,
  changes: Record<string, unknown> = {},
) {
  await backend.updateDoc(
    kind,
    id,
    { ...changes, status: NEXT_STATUS[action], updatedAt: Date.now() },
    entry(profile, action, note),
  );
  await notifyRoles({
    roles: NOTIFY_ROLES[action],
    kind,
    action,
    docId: id,
    docTitle: title,
    byName: profile.name,
    byRole: profile.role,
    byUid: profile.uid,
    note: note.trim(),
  });
}
