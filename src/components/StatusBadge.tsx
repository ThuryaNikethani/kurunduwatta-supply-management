"use client";

import { CheckCircle2, Clock, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import type { Status } from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLE: Record<Status, { cls: string; Icon: typeof Clock }> = {
  pending_supervisor: { cls: "bg-amber/20 text-amber-deep", Icon: Clock },
  pending_hr: { cls: "bg-amber/20 text-amber-deep", Icon: Clock },
  returned_to_chef: { cls: "bg-destructive/10 text-destructive", Icon: Undo2 },
  returned_to_supervisor: { cls: "bg-destructive/10 text-destructive", Icon: Undo2 },
  approved: { cls: "bg-leaf/30 text-leaf-deep", Icon: CheckCircle2 },
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const { t } = useI18n();
  const { cls, Icon } = STYLE[status];
  return (
    <Badge variant="secondary" className={cn("rounded-full border-transparent", cls, className)}>
      <Icon />
      {t(`status.${status}`)}
    </Badge>
  );
}
