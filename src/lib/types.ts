export type Role = "chef" | "supervisor" | "hr";

export const ROLES: Role[] = ["chef", "supervisor", "hr"];

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  fcmTokens?: string[];
  createdAt?: number;
}

export type Status =
  | "pending_supervisor"
  | "returned_to_chef"
  | "pending_hr"
  | "returned_to_supervisor"
  | "approved";

export const STATUSES: Status[] = [
  "pending_supervisor",
  "returned_to_chef",
  "pending_hr",
  "returned_to_supervisor",
  "approved",
];

export type Action =
  | "submit"
  | "resubmit"
  | "return_to_chef"
  | "forward_to_hr"
  | "approve"
  | "reject_to_supervisor";

export interface HistoryEntry {
  at: number;
  uid: string;
  name: string;
  role: Role;
  action: Action;
  note: string;
}

export type Unit = "g" | "kg" | "ml" | "l" | "pcs" | "pkt" | "btl" | "bunch";

export const UNITS: Unit[] = ["g", "kg", "ml", "l", "pcs", "pkt", "btl", "bunch"];

export interface Ingredient {
  name: string;
  unit: Unit;
  qtyPerPerson: number;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  ingredients: Ingredient[];
  /** True once the chef has checked the amounts (starting amounts are estimates). */
  reviewed?: boolean;
  /** Guest menu or villa staff meals. Missing means the guest menu. */
  menu?: Audience;
  updatedAt?: number;
}

export interface DishRef {
  id: string;
  name: string;
}

export interface SupplyItem {
  name: string;
  unit: Unit;
  qty: number;
  /** Quantity worked out from recipes, kept so reviewers can see changes. */
  calculated?: number | null;
  note: string;
}

export type DocKind = "supply" | "transfer";

interface WorkflowDoc {
  id: string;
  status: Status;
  history: HistoryEntry[];
  createdBy: string;
  createdByName: string;
  createdAt: number;
  updatedAt: number;
}

/** Who the food is for: hotel guests or the villa's own staff. */
export type Audience = "guests" | "staff";

export const AUDIENCES: Audience[] = ["guests", "staff"];

export interface SupplyList extends WorkflowDoc {
  /** Missing on older lists, which were all for guests. */
  audience?: Audience;
  title: string;
  eventDate: string;
  meal: string;
  guestCount: number;
  dishes: DishRef[];
  items: SupplyItem[];
}

export interface LeftoverItem {
  dish: string;
  /** Number of people the leftover portion can feed. */
  portions: number;
  note: string;
}

export interface TransferOut extends WorkflowDoc {
  supplyId: string;
  supplyTitle: string;
  guestCount: number;
  date: string;
  items: LeftoverItem[];
  recipients: string[];
}

// ---------------------------------------------------------------- stock & orders

export interface StockItem {
  id: string;
  name: string;
  unit: Unit;
  qty: number;
  /** Below or at this amount the item shows as running low. */
  minQty: number;
  updatedAt?: number;
}

export type StockReason = "issue" | "receive" | "adjust";

export interface StockMove {
  id: string;
  itemId: string;
  itemName: string;
  unit: Unit;
  change: number;
  qtyAfter: number;
  reason: StockReason;
  note: string;
  refKind?: string | null;
  refId?: string | null;
  byName: string;
  createdAt: number;
}

export interface StockLine {
  itemId: string | null;
  name: string;
  unit: Unit;
  qty: number;
}

export interface StockIssue {
  supplyId: string;
  lines: StockLine[];
  byName: string;
  createdAt: number;
}

export type OrderStatus = "pending_hr" | "returned" | "approved" | "received";
export const ORDER_STATUSES: OrderStatus[] = ["pending_hr", "returned", "approved", "received"];
export type OrderAction = "po_submit" | "po_resubmit" | "po_approve" | "po_return" | "po_receive";

export interface OrderItem {
  name: string;
  unit: Unit;
  qty: number;
  note: string;
}

export interface OrderHistoryEntry {
  at: number;
  uid: string;
  name: string;
  role: Role;
  action: OrderAction;
  note: string;
}

export interface PurchaseOrder {
  id: string;
  supplier: string;
  items: OrderItem[];
  status: OrderStatus;
  history: OrderHistoryEntry[];
  createdBy: string;
  createdByName: string;
  createdAt: number;
  updatedAt: number;
}

/** What a notification is about. */
export type NotifKind = DocKind | "po";
export type AnyAction = Action | OrderAction;

export interface AppNotification {
  id: string;
  kind: NotifKind;
  action: AnyAction;
  docId: string;
  docTitle: string;
  byName: string;
  byRole: Role;
  note: string;
  read: boolean;
  createdAt: number;
}

export const COLLECTION: Record<DocKind, string> = {
  supply: "supplyLists",
  transfer: "transferOuts",
};

export function docLink(kind: NotifKind, id: string) {
  if (kind === "po") return `/orders/${id}`;
  return kind === "supply" ? `/requests/${id}` : `/leftovers/${id}`;
}
