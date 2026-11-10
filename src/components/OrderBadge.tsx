"use client";

import { CheckCircle2, Clock, PackageCheck, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useI18n, type TKey } from "@/lib/i18n";
import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLE: Record<OrderStatus, { cls: string; Icon: typeof Clock }> = {
  pending_hr: { cls: "bg-amber/20 text-amber-deep", Icon: Clock },
  returned: { cls: "bg-destructive/10 text-destructive", Icon: Undo2 },
  approved: { cls: "bg-leaf/30 text-leaf-deep", Icon: CheckCircle2 },
  received: { cls: "bg-secondary text-moss", Icon: PackageCheck },
};

export function OrderBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const { t } = useI18n();
  const { cls, Icon } = STYLE[status];
  return (
    <Badge variant="secondary" className={cn("rounded-full border-transparent", cls, className)}>
      <Icon />
      {t(`order.status.${status}` as TKey)}
    </Badge>
  );
}
