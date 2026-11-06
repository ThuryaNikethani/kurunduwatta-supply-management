"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ActionPanel } from "@/components/ActionPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { Timeline } from "@/components/Timeline";
import { useToast } from "@/components/Toast";
import { TransferForm } from "@/components/TransferForm";
import { PrintButton, PrintHeader } from "@/components/PrintHeader";
import { performAction } from "@/lib/actions";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { useDocument } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import type { SupplyList, TransferOut } from "@/lib/types";

export default function TransferDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const toast = useToast();
  const d = useDocument<TransferOut>("transferOuts", id);
  const supply = useDocument<SupplyList>("supplyLists", d?.supplyId || "_");
  const [editing, setEditing] = useState(false);

  if (d === undefined) return <p className="text-muted">{t("loading")}</p>;
  if (d === null || !profile) return <p className="text-muted">{t("detail.notFound")}</p>;

  const canEdit = profile.role === "chef" && d.status === "returned_to_chef";
  const portions = d.items.reduce((s, i) => s + (Number(i.portions) || 0), 0);

  if (editing && canEdit)
    return (
      <div className="space-y-6">
        <h1 className="h1">{t("transfer.new")}</h1>
        <TransferForm
          dishOptions={supply?.dishes.map((x) => x.name) ?? []}
          guestCount={d.guestCount}
          initial={d}
          submitLabel={t("supply.saveResend")}
          onCancel={() => setEditing(false)}
          onSubmit={async (data, note) => {
            await performAction("transfer", d.id, d.supplyTitle, profile, "resubmit", note, { ...data });
            setEditing(false);
            toast({ text: t("action.resubmit") + " ✓", tone: "success" });
          }}
        />
      </div>
    );

  return (
    <div className="space-y-6">
      <PrintHeader heading={t("transfer.new")} />
      <div className="no-print flex items-center justify-between gap-3">
        <Link href="/dashboard" className="text-sm text-muted hover:text-forest">← {t("back")}</Link>
        <PrintButton />
      </div>

      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-wide text-muted uppercase">{t("transfer.new")}</p>
            <h1 className="h1">{d.supplyTitle}</h1>
          </div>
          <StatusBadge status={d.status} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Info label={t("transfer.date")} value={formatDate(d.date, lang)} />
          <Info label={t("supply.guests")} value={String(d.guestCount)} />
          <Info label={t("transfer.portions")} value={String(portions)} />
          <Info label={t("detail.createdBy")} value={d.createdByName} />
        </dl>
        <p className="mt-4 rounded-xl bg-mist px-3 py-2 text-sm">
          {t("transfer.summary", { guests: d.guestCount, portions })} ·{" "}
          <Link href={`/requests/${d.supplyId}`} className="underline">{t("dash.supplyLists")} →</Link>
        </p>
      </div>

      <div className="print-full grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card overflow-x-auto">
            <h2 className="h2 mb-3">{t("transfer.items")}</h2>
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-mist text-left text-xs text-muted uppercase">
                  <th className="py-2 pr-2">{t("transfer.dish")}</th>
                  <th className="py-2 pr-2">{t("transfer.portions")}</th>
                  <th className="py-2">{t("supply.note")}</th>
                </tr>
              </thead>
              <tbody>
                {d.items.map((it, i) => (
                  <tr key={i} className="border-b border-mist/60">
                    <td className="py-2 pr-2 font-medium">{it.dish}</td>
                    <td className="py-2 pr-2">{it.portions}</td>
                    <td className="py-2 text-muted">{it.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card">
            <h2 className="h2 mb-3">{t("transfer.recipients")}</h2>
            <div className="flex flex-wrap gap-2">
              {d.recipients.map((r) => (
                <span key={r} className="rounded-full bg-mist px-3 py-1 text-sm">{r}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <ActionPanel kind="transfer" id={d.id} title={d.supplyTitle} status={d.status}>
            {canEdit && (
              <button className="btn-outline mb-4 w-full" onClick={() => setEditing(true)}>
                {t("supply.edit")}
              </button>
            )}
          </ActionPanel>
          <Timeline history={d.history} />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted uppercase">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
