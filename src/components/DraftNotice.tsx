"use client";

import { History, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

/** Tells the user their unsent input was brought back, with a way to start over. */
export function DraftNotice({ restoredAt, onDiscard }: { restoredAt: number | null; onDiscard: () => void }) {
  const { t } = useI18n();
  if (!restoredAt) return null;
  return (
    <div role="status" className="flex flex-col gap-3 rounded-xl border border-moss/20 bg-moss/5 p-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        <History className="size-5 shrink-0 text-moss" />
        <p className="text-sm">{t("draft.restored", { time: formatDateTime(restoredAt) })}</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onDiscard}>
        <RotateCcw /> {t("draft.discard")}
      </Button>
    </div>
  );
}
