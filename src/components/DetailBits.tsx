"use client";

import Link from "next/link";
import { ArrowLeft, Undo2, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { PrintButton } from "./PrintHeader";

export function BackBar({ href = "/dashboard" }: { href?: string }) {
  const { t } = useI18n();
  return (
    <div className="no-print flex items-center justify-between gap-3">
      <Link href={href} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-forest">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>
      <PrintButton />
    </div>
  );
}

export function InfoGrid({ items }: { items: { Icon: LucideIcon; label: string; value: React.ReactNode }[] }) {
  return (
    <Card className="py-4">
      <CardContent className="grid grid-cols-2 gap-4 px-4 sm:grid-cols-4">
        {items.map(({ Icon, label, value }) => (
          <div key={label} className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-moss">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
              <p className="truncate text-sm font-medium">{value}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** Why a list was sent back, shown in red at the top so it isn't missed. */
export function ReturnNote({ status, history }: { status: string; history: { action: string; note: string; name: string }[] }) {
  const { t } = useI18n();
  const last = history[history.length - 1];
  if (!status.startsWith("returned") || !last || !/return|reject/.test(last.action ?? "") || !(last.note ?? "").trim()) return null;
  return (
    <div role="alert" className="flex gap-3 rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4">
      <Undo2 className="mt-0.5 size-6 shrink-0 text-destructive" />
      <div className="min-w-0">
        <p className="font-semibold text-destructive">{t("detail.whyBack", { name: last.name })}</p>
        <p className="mt-1 text-lg whitespace-pre-wrap">{last.note}</p>
      </div>
    </div>
  );
}

/** The supervisor's note (and any amounts they changed), shown to HR at the top. */
export function ForwardNote({ status, history }: { status: string; history: { action: string; note: string; name: string }[] }) {
  const { t } = useI18n();
  const last = history[history.length - 1];
  if (status !== "pending_hr" || !last || last.action !== "forward_to_hr" || !(last.note ?? "").trim()) return null;
  return (
    <div className="rounded-xl border-2 border-amber/60 bg-amber/10 p-4">
      <p className="font-semibold text-amber-deep">{t("detail.noteFrom", { name: last.name })}</p>
      <p className="mt-1 text-lg whitespace-pre-wrap">{last.note}</p>
    </div>
  );
}
