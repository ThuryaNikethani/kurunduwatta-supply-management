"use client";

import { CheckCircle2, Forward, History, PackageCheck, Send, Undo2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { AnyAction, HistoryEntry, OrderHistoryEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICON: Record<AnyAction, { Icon: typeof Send; cls: string }> = {
  submit: { Icon: Send, cls: "bg-amber/20 text-amber-deep" },
  resubmit: { Icon: Send, cls: "bg-amber/20 text-amber-deep" },
  forward_to_hr: { Icon: Forward, cls: "bg-amber/20 text-amber-deep" },
  return_to_chef: { Icon: Undo2, cls: "bg-destructive/10 text-destructive" },
  reject_to_supervisor: { Icon: Undo2, cls: "bg-destructive/10 text-destructive" },
  approve: { Icon: CheckCircle2, cls: "bg-leaf/30 text-leaf-deep" },
  po_submit: { Icon: Send, cls: "bg-amber/20 text-amber-deep" },
  po_resubmit: { Icon: Send, cls: "bg-amber/20 text-amber-deep" },
  po_approve: { Icon: CheckCircle2, cls: "bg-leaf/30 text-leaf-deep" },
  po_return: { Icon: Undo2, cls: "bg-destructive/10 text-destructive" },
  po_receive: { Icon: PackageCheck, cls: "bg-leaf/30 text-leaf-deep" },
};

export function Timeline({ history }: { history: (HistoryEntry | OrderHistoryEntry)[] }) {
  const { t } = useI18n();
  const items = [...history].sort((a, b) => a.at - b.at);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-2xl">
          <History className="size-5 text-muted-foreground" />
          {t("detail.history")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative grid gap-5">
          <span className="absolute top-2 bottom-2 left-[15px] w-px bg-border" aria-hidden />
          {items.map((h, i) => {
            const { Icon, cls } = ICON[h.action];
            return (
              <li key={i} className="relative flex gap-3">
                <span className={cn("z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-card", cls)}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm">
                    <span className="font-medium">{h.name}</span>{" "}
                    <span className="text-muted-foreground">({t(`role.${h.role}`)})</span> {t(`did.${h.action}`)}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(h.at)}</p>
                  {h.note && (
                    <p className="mt-1.5 rounded-lg bg-secondary/60 px-3 py-2 text-sm whitespace-pre-wrap">“{h.note}”</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
