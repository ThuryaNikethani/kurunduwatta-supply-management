"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, CalendarRange, ChefHat, ChevronRight, Pencil, Plus, Soup, Users, UtensilsCrossed } from "lucide-react";
import { ActionPanel } from "@/components/ActionPanel";
import { AudienceBadge, EmptyState, PageHeader } from "@/components/common";
import { BackBar, InfoGrid } from "@/components/DetailBits";
import { PrintHeader } from "@/components/PrintHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { StockIssuePanel } from "@/components/StockIssuePanel";
import { SupplyForm } from "@/components/SupplyForm";
import { Timeline } from "@/components/Timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    <div className="grid gap-6">
      <PrintHeader heading={t("dash.supplyLists")} />
      <BackBar />
      <PageHeader
        eyebrow={t("dash.supplyLists")}
        title={d.title}
        subtitle={<span className="mt-1 flex flex-wrap gap-2"><StatusBadge status={d.status} /><AudienceBadge audience={d.audience} /></span>}
      />

      <InfoGrid
        items={[
          { Icon: CalendarDays, label: t("supply.orderDate"), value: formatDate(d.eventDate) },
          { Icon: CalendarRange, label: t("supply.days"), value: t("supply.forDays", { n: d.days ?? 1 }) },
          ...(d.audience === "staff" ? [] : [{ Icon: UtensilsCrossed, label: t("supply.meal"), value: t(`meal.${d.meal}` as TKey) }]),
          { Icon: Users, label: t(d.audience === "staff" ? "supply.staffCount" : "supply.guests"), value: d.guestCount },
          { Icon: ChefHat, label: t("detail.createdBy"), value: d.createdByName },
        ]}
      />

      <div className="print-full grid gap-6 lg:grid-cols-3">
        <div className="grid content-start gap-6 lg:col-span-2">
          {d.dishes.length > 0 && (
            <Card className="gap-3 py-4">
              <CardContent className="flex flex-wrap gap-2 px-4">
                {d.dishes.map((x) => (
                  <Badge key={x.id} variant="secondary" className="rounded-full px-3 py-1">{x.name}</Badge>
                ))}
              </CardContent>
            </Card>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("supply.item")}</TableHead>
                    <TableHead className="text-right">{t("supply.qty")}</TableHead>
                    <TableHead className="text-right">{t("supply.calc")}</TableHead>
                    <TableHead>{t("supply.note")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.items.map((it, i) => {
                    const changed = it.calculated != null && it.qty !== it.calculated;
                    return (
                      <TableRow key={i} className={cn(changed && "bg-amber/10 hover:bg-amber/15")}>
                        <TableCell className="font-medium">{it.name}</TableCell>
                        <TableCell className={cn("text-right tabular-nums", changed && "font-semibold text-amber-deep")}>
                          {qty(it.qty, it.unit)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums">
                          {it.calculated != null ? qty(it.calculated, it.unit) : "—"}
                        </TableCell>
                        <TableCell className="max-w-56 whitespace-normal text-muted-foreground">{it.note}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
        </div>

        <div className="grid content-start gap-6">
          <ActionPanel kind="supply" id={d.id} title={d.title} status={d.status}>
            {canEdit && (
              <Button variant="outline" className="w-full" onClick={() => setEditing(true)}>
                <Pencil /> {t("supply.edit")}
              </Button>
            )}
          </ActionPanel>
          <Timeline history={d.history} />
        </div>
      </div>
    </div>
  );
}
