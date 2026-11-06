"use client";

import { useI18n } from "@/lib/i18n";
import type { Status } from "@/lib/types";

const STYLE: Record<Status, string> = {
  pending_supervisor: "bg-amber/20 text-amber-deep",
  pending_hr: "bg-amber/20 text-amber-deep",
  returned_to_chef: "bg-danger/10 text-danger",
  returned_to_supervisor: "bg-danger/10 text-danger",
  approved: "bg-leaf/30 text-leaf-deep",
};

export function StatusBadge({ status }: { status: Status }) {
  const { t } = useI18n();
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLE[status]}`}
    >
      {t(`status.${status}`)}
    </span>
  );
}
