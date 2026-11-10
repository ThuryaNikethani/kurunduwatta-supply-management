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

export interface AppNotification {
  id: string;
  kind: DocKind;
  action: Action;
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

export function docLink(kind: DocKind, id: string) {
  return kind === "supply" ? `/requests/${id}` : `/leftovers/${id}`;
}
