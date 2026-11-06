import { addDoc, arrayUnion, collection, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { notifyRoles } from "./notify";
import { NEXT_STATUS, NOTIFY_ROLES } from "./workflow";
import {
  COLLECTION,
  type Action,
  type DocKind,
  type HistoryEntry,
  type UserProfile,
} from "./types";

function entry(profile: UserProfile, action: Action, note: string): HistoryEntry {
  return {
    at: Date.now(),
    uid: profile.uid,
    name: profile.name,
    role: profile.role,
    action,
    note: note.trim(),
  };
}

/** Create a new supply list or transfer-out and notify the supervisor. */
export async function createWorkflowDoc(
  kind: DocKind,
  profile: UserProfile,
  data: Record<string, unknown> & { title?: string; supplyTitle?: string },
  note: string,
) {
  const now = Date.now();
  const ref = await addDoc(collection(db, COLLECTION[kind]), {
    ...data,
    status: NEXT_STATUS.submit,
    history: [entry(profile, "submit", note)],
    createdBy: profile.uid,
    createdByName: profile.name,
    createdAt: now,
    updatedAt: now,
  });
  await notifyRoles({
    roles: NOTIFY_ROLES.submit,
    kind,
    action: "submit",
    docId: ref.id,
    docTitle: String(data.title ?? data.supplyTitle ?? ""),
    byName: profile.name,
    byRole: profile.role,
    byUid: profile.uid,
    note: note.trim(),
  });
  return ref.id;
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
  await updateDoc(doc(db, COLLECTION[kind], id), {
    ...changes,
    status: NEXT_STATUS[action],
    history: arrayUnion(entry(profile, action, note)),
    updatedAt: Date.now(),
  });
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
