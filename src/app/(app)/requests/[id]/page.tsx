"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, CalendarRange, ChefHat, ChevronRight, Pencil, Plus, Soup, Users, UtensilsCrossed } from "lucide-react";
import { ActionPanel } from "@/components/ActionPanel";
import { AudienceBadge, EmptyState, PageHeader } from "@/components/common";
import { BackBar, InfoGrid, ReturnNote } from "@/components/DetailBits";
import { PrintHeader } from "@/components/PrintHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { StockIssuePanel } from "@/components/StockIssuePanel";
import { SupplyForm } from "@/components/SupplyForm";
import { Timeline } from "@/components/Timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
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
  const changedCount = d.items.filter((it) => it.calculated != null && it.qty !== it.calculated).length;

  if (editing && canEdit)
    return (
      <div className="grid gap-6">
        <PageHeader eyebrow={d.title} title={t("supply.edit")} />
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

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5">
      <PrintHeader heading={t("dash.supplyLists")} />
      <BackBar />
      <PageHeader
        title={d.title}
        subtitle={<span className="mt-1 flex flex-wrap gap-2"><StatusBadge status={d.status} /><AudienceBadge audience={d.audience} /></span>}
      />

      <ReturnNote history={d.history} />

      <ActionPanel kind="supply" id={d.id} title={d.title} status={d.status}>
        {canEdit && (
          <Button variant="accent" className="h-14 w-full text-lg" onClick={() => setEditing(true)}>
            <Pencil className="size-5" /> {t("supply.edit")}
          </Button>
        )}
      </ActionPanel>

      <InfoGrid
        items={[
          { Icon: Users, label: t(d.audience === "staff" ? "supply.staffCount" : "supply.guests"), value: d.guestCount },
          { Icon: CalendarRange, label: t("supply.days"), value: t("supply.forDays", { n: d.days ?? 1 }) },
          ...(d.audience === "staff" ? [] : [{ Icon: UtensilsCrossed, label: t("supply.meal"), value: t(`meal.${d.meal}` as TKey) }]),
          { Icon: CalendarDays, label: t("supply.orderDate"), value: formatDate(d.eventDate) },
          { Icon: ChefHat, label: t("detail.createdBy"), value: d.createdByName },
        ]}
      />

      {d.dishes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {d.dishes.map((x) => (
            <Badge key={x.id} variant="secondary" className="rounded-full px-3 py-1 text-sm">{x.name}</Badge>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">{t("supply.items")}</CardTitle>
          <CardAction className="text-sm text-muted-foreground">
            {t("supply.totalItems", { n: d.items.length })}
            {changedCount > 0 && <span className="ml-2 text-amber-deep">· {changedCount} {t("supply.changed")}</span>}
          </CardAction>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {d.items.map((it, i) => {
              const changed = it.calculated != null && it.qty !== it.calculated;
              return (
                <li key={i} className={cn("flex items-start gap-3 py-3", changed && "-mx-2 rounded-lg bg-amber/10 px-2")}>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{it.name}</p>
                    {it.note && <p className="text-sm text-muted-foreground">{it.note}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cn("text-base font-semibold tabular-nums", changed && "text-amber-deep")}>{qty(it.qty, it.unit)}</p>
                    {changed && <p className="text-xs text-muted-foreground">{t("supply.calc")}: {qty(it.calculated!, it.unit)}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {d.status === "approved" && <StockIssuePanel supply={d} />}

      {d.status === "approved" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-2xl">
              <Soup className="size-5 text-muted-foreground" /> {t("transfer.linked")}
            </CardTitle>
            {profile.role === "chef" && (
              <CardAction className="no-print">
                <Button asChild variant="accent">
                  <Link href={`/leftovers/new?supply=${d.id}`}><Plus /> {t("supply.recordLeftovers")}</Link>
                </Button>
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            {!transfers?.length ? (
              <p className="text-sm text-muted-foreground">{t("dash.empty")}</p>
            ) : (
              <ul className="divide-y">
                {transfers.map((x) => (
                  <li key={x.id}>
                    <Link href={`/leftovers/${x.id}`} className="flex items-center gap-3 py-3 text-sm hover:text-moss">
                      <span className="flex-1">
                        {formatDate(x.date)} ·{" "}
                        {t("transfer.summary", { guests: x.guestCount, portions: x.items.reduce((s, i) => s + (Number(i.portions) || 0), 0) })}
                      </span>
                      <StatusBadge status={x.status} />
                      <ChevronRight className="size-4 text-muted-foreground" />
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
