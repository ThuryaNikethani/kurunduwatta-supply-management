"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ClipboardList, Pencil } from "lucide-react";
import { ActionPanel } from "@/components/ActionPanel";
import { EmptyState } from "@/components/common";
import { BackBar, ReturnNote } from "@/components/DetailBits";
import { PrintHeader } from "@/components/PrintHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Timeline } from "@/components/Timeline";
import { TransferForm } from "@/components/TransferForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { performAction } from "@/lib/actions";
import { useAuth } from "@/lib/auth";
import { hasDraft } from "@/lib/draft";
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
  const draftKey = `transfer-edit-${id}`;
  const editable = profile?.role === "chef" && d?.status === "returned_to_chef";
  // Came back after a refresh with unsent changes: reopen the edit form.
  useEffect(() => {
    if (editable && hasDraft(profile?.uid, draftKey)) setEditing(true);
  }, [editable, profile?.uid, draftKey]);

  if (d === undefined) return <Skeleton className="h-96" />;
  if (d === null || !profile) return <EmptyState text={t("detail.notFound")} />;

  const canEdit = profile.role === "chef" && d.status === "returned_to_chef";
  const portions = d.items.reduce((s, i) => s + (Number(i.portions) || 0), 0);

  if (editing && canEdit)
    return (
      <div className="mx-auto grid w-full max-w-3xl gap-4 [&>*]:min-w-0">
        <h1 className="font-display text-3xl font-semibold">{t("transfer.new")}</h1>
        <TransferForm
          draftKey={draftKey}
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
    <div className="mx-auto grid w-full max-w-3xl gap-4 [&>*]:min-w-0">
      <PrintHeader heading={t("transfer.new")} />
      <BackBar />

      <div className="grid gap-2">
        <p className="text-sm text-muted-foreground">{t("transfer.new")}</p>
        <h1 className="font-display text-3xl font-semibold">{d.supplyTitle}</h1>
        <div><StatusBadge status={d.status} className="text-sm" /></div>
        <p className="text-muted-foreground">{formatDate(d.date)} · {t("transfer.summary", { guests: d.guestCount, portions })} · {d.createdByName}</p>
      </div>

      <ReturnNote status={d.status} history={d.history} />

      <ActionPanel kind="transfer" id={d.id} title={d.supplyTitle} status={d.status}>
        {canEdit && (
          <Button variant="accent" size="lg" className="w-full" onClick={() => setEditing(true)}>
            <Pencil /> {t("supply.edit")}
          </Button>
        )}
      </ActionPanel>

      <Card className="print-flow">
        <CardContent className="grid gap-3">
          <p className="text-lg font-semibold">{t("transfer.items")}</p>
          <ul className="divide-y">
            {d.items.map((it, i) => (
              <li key={i} className="flex items-start gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium">{it.dish}</p>
                  {it.note && <p className="text-sm text-muted-foreground">{it.note}</p>}
                </div>
                <p className="shrink-0 text-base font-semibold">{t("people", { n: it.portions })}</p>
              </li>
            ))}
          </ul>
          <p className="text-lg font-semibold">{t("transfer.recipients")}</p>
          <p className="text-base">{d.recipients.join(", ")}</p>
          <Button asChild variant="outline" className="no-print w-full">
            <Link href={`/requests/${d.supplyId}`}><ClipboardList /> {t("dash.supplyLists")}</Link>
          </Button>
        </CardContent>
      </Card>

      <Timeline history={d.history} />
    </div>
  );
}
