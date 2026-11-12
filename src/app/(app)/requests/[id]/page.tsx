"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Pencil, Plus } from "lucide-react";
import { ActionPanel } from "@/components/ActionPanel";
import { EmptyState } from "@/components/common";
import { BackBar, ReturnNote } from "@/components/DetailBits";
import { PrintHeader } from "@/components/PrintHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { StockIssuePanel } from "@/components/StockIssuePanel";
import { SupplyForm } from "@/components/SupplyForm";
import { Timeline } from "@/components/Timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { performAction } from "@/lib/actions";
import { useAuth } from "@/lib/auth";
import { hasDraft } from "@/lib/draft";
import { formatDate, qty } from "@/lib/format";
import { useDoc, useTransfersFor } from "@/lib/hooks";
import { useI18n, type TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function SupplyDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { t } = useI18n();
  const d = useDoc("supply", id);
  const transfers = useTransfersFor(id);
  const [editing, setEditing] = useState(false);
  const draftKey = `supply-edit-${id}`;
  const editable = profile?.role === "chef" && d?.status === "returned_to_chef";
  // Came back after a refresh with unsent changes: reopen the edit form.
  useEffect(() => {
    if (editable && hasDraft(profile?.uid, draftKey)) setEditing(true);
  }, [editable, profile?.uid, draftKey]);

  if (d === undefined) return <Skeleton className="h-96" />;
  if (d === null || !profile) return <EmptyState text={t("detail.notFound")} />;

  const canEdit = profile.role === "chef" && d.status === "returned_to_chef";

  if (editing && canEdit)
    return (
      <div className="mx-auto grid w-full max-w-3xl gap-4 [&>*]:min-w-0">
        <h1 className="font-display text-3xl font-semibold">{t("supply.edit")}</h1>
        <SupplyForm
          draftKey={draftKey}
          initial={d}
          submitLabel={t("supply.saveResend")}
          onCancel={() => setEditing(false)}
          onSubmit={async (data, note) => {
            await performAction("supply", d.id, data.title, profile, "resubmit", note, { ...data });
            setEditing(false);
            toast.success(t("did.resubmit"));
          }}
        />
      </div>
    );

  /** Who, how many, when — on one line. */
  const facts = [
    t(d.audience === "staff" ? "audience.staff" : "audience.guests"),
    t("supply.calcFor", { n: d.guestCount, d: d.days ?? 1 }),
    d.audience !== "staff" && t(`meal.${d.meal}` as TKey),
    formatDate(d.eventDate),
    d.createdByName,
  ].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4 [&>*]:min-w-0">
      <PrintHeader heading={t("dash.supplyLists")} />
      <BackBar />

      <div className="grid gap-2">
        <h1 className="font-display text-3xl font-semibold">{d.title}</h1>
        <div><StatusBadge status={d.status} className="text-sm" /></div>
        <p className="text-muted-foreground">{facts}</p>
      </div>

      <ReturnNote status={d.status} history={d.history} />

      <ActionPanel kind="supply" id={d.id} title={d.title} status={d.status}>
        {canEdit && (
          <Button variant="accent" size="lg" className="w-full" onClick={() => setEditing(true)}>
            <Pencil /> {t("supply.edit")}
          </Button>
        )}
      </ActionPanel>

      <Card>
        <CardContent className="grid gap-3">
          {d.dishes.length > 0 && (
            <p className="text-muted-foreground">{d.dishes.map((x) => x.name).join(" · ")}</p>
          )}
          <p className="text-lg font-semibold">{t("simple.items")} ({d.items.length})</p>
          <ul className="divide-y">
            {d.items.map((it, i) => {
              const changed = it.calculated != null && it.qty !== it.calculated;
              return (
                <li key={i} className={cn("flex items-start gap-3 py-2.5", changed && "-mx-2 rounded-lg bg-amber/10 px-2")}>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-medium">{it.name}</p>
                    {it.note && <p className="text-sm text-muted-foreground">{it.note}</p>}
                    {changed && <p className="text-sm text-amber-deep">{t("simple.wasCalc", { q: qty(it.calculated!, it.unit) })}</p>}
                  </div>
                  <p className={cn("shrink-0 text-base font-semibold tabular-nums", changed && "text-amber-deep")}>{qty(it.qty, it.unit)}</p>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {d.status === "approved" && <StockIssuePanel supply={d} />}

      {d.status === "approved" && (
        <Card>
          <CardContent className="grid gap-3">
            <p className="text-lg font-semibold">{t("transfer.linked")}</p>
            {profile.role === "chef" && (
              <Button asChild variant="accent" size="lg" className="no-print w-full">
                <Link href={`/leftovers/new?supply=${d.id}`}><Plus /> {t("supply.recordLeftovers")}</Link>
              </Button>
            )}
            {!transfers?.length ? (
              <p className="text-muted-foreground">{t("dash.empty")}</p>
            ) : (
              <ul className="divide-y">
                {transfers.map((x) => (
                  <li key={x.id}>
                    <Link href={`/leftovers/${x.id}`} className="flex items-center gap-3 py-3 hover:text-moss">
                      <span className="flex-1">
                        {formatDate(x.date)} ·{" "}
                        {t("transfer.summary", { guests: x.guestCount, portions: x.items.reduce((s, i) => s + (Number(i.portions) || 0), 0) })}
                      </span>
                      <StatusBadge status={x.status} />
                      <ChevronRight className="size-5 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Timeline history={d.history} />
    </div>
  );
}
