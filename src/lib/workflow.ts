import type { Action, Role, Status } from "./types";

/** Actions a role may take on a document in a given status. */
export function availableActions(role: Role, status: Status): Action[] {
  if (role === "chef" && status === "returned_to_chef") return ["resubmit"];
  if (
    role === "supervisor" &&
    (status === "pending_supervisor" || status === "returned_to_supervisor")
  )
    return ["forward_to_hr", "return_to_chef"];
  if (role === "hr" && status === "pending_hr") return ["approve", "reject_to_supervisor"];
  return [];
}

export const NEXT_STATUS: Record<Action, Status> = {
  submit: "pending_supervisor",
  resubmit: "pending_supervisor",
  return_to_chef: "returned_to_chef",
  forward_to_hr: "pending_hr",
  approve: "approved",
  reject_to_supervisor: "returned_to_supervisor",
};

/** Sending something back always needs a reason. */
export function noteRequired(action: Action) {
  return action === "return_to_chef" || action === "reject_to_supervisor";
}

/** Who gets notified after each action. */
export const NOTIFY_ROLES: Record<Action, Role[]> = {
  submit: ["supervisor"],
  resubmit: ["supervisor"],
  return_to_chef: ["chef"],
  forward_to_hr: ["hr"],
  approve: ["chef", "supervisor"],
  reject_to_supervisor: ["supervisor"],
};

/** Whose turn it is for a status, used to highlight "needs your action". */
export const WAITING_ON: Record<Status, Role | null> = {
  pending_supervisor: "supervisor",
  returned_to_chef: "chef",
  pending_hr: "hr",
  returned_to_supervisor: "supervisor",
  approved: null,
};
