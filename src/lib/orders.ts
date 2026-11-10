import { backend } from "./backend";
import { notifyRoles } from "./notify";
import type { OrderAction, OrderHistoryEntry, OrderItem, OrderStatus, PurchaseOrder, Role, StockLine, UserProfile } from "./types";

/**
 * Purchase order steps: supervisor sends → HR approves or returns →
 * supervisor marks the goods received (they go into stock).
 */

export function orderActions(role: Role, status: OrderStatus): OrderAction[] {
  if (role === "hr" && status === "pending_hr") return ["po_approve", "po_return"];
  if (role === "supervisor" && status === "approved") return ["po_receive"];
  if (role === "supervisor" && status === "returned") return ["po_resubmit"];
  return [];
}

export const ORDER_NEXT: Record<OrderAction, OrderStatus> = {
  po_submit: "pending_hr",
  po_resubmit: "pending_hr",
  po_approve: "approved",
  po_return: "returned",
  po_receive: "received",
};

const NOTIFY: Record<OrderAction, Role[]> = {
  po_submit: ["hr"],
  po_resubmit: ["hr"],
  po_approve: ["supervisor"],
  po_return: ["supervisor"],
  po_receive: ["hr"],
};

export const ORDER_WAITING_ON: Record<OrderStatus, Role | null> = {
  pending_hr: "hr",
  returned: "supervisor",
  approved: "supervisor",
  received: null,
};

export const orderNoteRequired = (a: OrderAction) => a === "po_return";

function entry(p: UserProfile, action: OrderAction, note: string): OrderHistoryEntry {
  return { at: Date.now(), uid: p.uid, name: p.name, role: p.role, action, note: note.trim() };
}

function notify(o: { id: string; supplier: string }, p: UserProfile, action: OrderAction, note: string) {
  return notifyRoles({
    roles: NOTIFY[action],
    kind: "po",
    action,
    docId: o.id,
    docTitle: o.supplier,
    byName: p.name,
    byRole: p.role,
    byUid: p.uid,
    note: note.trim(),
  });
}

export async function createOrder(p: UserProfile, data: { supplier: string; items: OrderItem[] }, note: string) {
  const now = Date.now();
  const order: Omit<PurchaseOrder, "id"> = {
    ...data,
    status: "pending_hr",
    history: [entry(p, "po_submit", note)],
    createdBy: p.uid,
    createdByName: p.name,
    createdAt: now,
    updatedAt: now,
  };
  const id = await backend.createOrder(order);
  await notify({ id, supplier: data.supplier }, p, "po_submit", note);
  return id;
}

export async function performOrderAction(
  o: PurchaseOrder,
  p: UserProfile,
  action: Exclude<OrderAction, "po_receive" | "po_submit">,
  note: string,
  changes: Partial<Pick<PurchaseOrder, "supplier" | "items">> = {},
) {
  await backend.updateOrder(o.id, { ...changes, status: ORDER_NEXT[action], updatedAt: Date.now() }, entry(p, action, note));
  await notify({ id: o.id, supplier: changes.supplier ?? o.supplier }, p, action, note);
}

export async function receiveOrder(o: PurchaseOrder, p: UserProfile, lines: StockLine[], note: string) {
  await backend.receiveOrder(o.id, lines, entry(p, "po_receive", note));
  await notify(o, p, "po_receive", note);
}
