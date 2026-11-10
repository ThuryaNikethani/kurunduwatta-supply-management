"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, ChefHat, ClipboardList, Pencil, Soup, Users } from "lucide-react";
import { ActionPanel } from "@/components/ActionPanel";
import { EmptyState, PageHeader } from "@/components/common";
import { BackBar, InfoGrid } from "@/components/DetailBits";
import { PrintHeader } from "@/components/PrintHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Timeline } from "@/components/Timeline";
import { TransferForm } from "@/components/TransferForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { performAction } from "@/lib/actions";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { useDoc } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";

export default function TransferDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { t } = useI18n();
  const d = useDoc("transfer", id);
  const supply = useDoc("supply", d?.supplyId ?? null);
  const [editing, setEditing] = useState(false);

  if (d === undefined) return <Skeleton className="h-96" />;
  if (d === null || !profile) return <EmptyState text={t("detail.notFound")} />;

  const canEdit = profile.role === "chef" && d.status === "returned_to_chef";
  const portions = d.items.reduce((s, i) => s + (Number(i.portions) || 0), 0);

  if (editing && canEdit)
    return (
      <div className="grid gap-6">
        <PageHeader eyebrow={d.supplyTitle} title={t("transfer.new")} />
        <TransferForm
          dishOptions={supply?.dishes.map((x) => x.name) ?? []}
          guestCount={d.guestCount}
          initial={d}
          submitLabel={t("supply.saveResend")}
          onCancel={() => setEditing(false)}
          onSubmit={async (data, note) => {
            await performAction("transfer", d.id, d.supplyTitle, profile, "resubmit", note, { ...data });
            setEditing(false);
            toast.success(t("did.resubmit"));
          }}
        />
      </div>
    );

  return (
    <div className="grid gap-6">
      <PrintHeader heading={t("transfer.new")} />
      <BackBar />
      <PageHeader
        eyebrow={t("transfer.new")}
        title={d.supplyTitle}
        subtitle={<StatusBadge status={d.status} className="mt-1" />}
        actions={
          <Button asChild variant="outline">
            <Link href={`/requests/${d.supplyId}`}><ClipboardList /> {t("dash.supplyLists")}</Link>
          </Button>
        }
      />

      <InfoGrid
        items={[
          { Icon: CalendarDays, label: t("transfer.date"), value: formatDate(d.date) },
          { Icon: Users, label: t("transfer.madeFor"), value: t("people", { n: d.guestCount }) },
          { Icon: Soup, label: t("transfer.portions"), value: portions },
          { Icon: ChefHat, label: t("detail.createdBy"), value: d.createdByName },
        ]}
      />

      <div className="print-full grid gap-6 lg:grid-cols-3">
        <div className="grid content-start gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-2xl">{t("transfer.items")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("transfer.dish")}</TableHead>
                    <TableHead className="text-right">{t("transfer.portions")}</TableHead>
                    <TableHead>{t("supply.note")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.items.map((it, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{it.dish}</TableCell>
                      <TableCell className="text-right tabular-nums">{it.portions}</TableCell>
                      <TableCell className="max-w-56 whitespace-normal text-muted-foreground">{it.note}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="mt-4 rounded-lg bg-secondary/60 px-3 py-2 text-sm">
                {t("transfer.summary", { guests: d.guestCount, portions })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-2xl">
                <Users className="size-5 text-muted-foreground" /> {t("transfer.recipients")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {d.recipients.map((r) => (
                <Badge key={r} variant="secondary" className="rounded-full px-3 py-1 text-sm">{r}</Badge>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <ActionPanel kind="transfer" id={d.id} title={d.supplyTitle} status={d.status}>
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
