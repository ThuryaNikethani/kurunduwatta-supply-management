"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ActionPanel } from "@/components/ActionPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { SupplyForm } from "@/components/SupplyForm";
import { Timeline } from "@/components/Timeline";
import { useToast } from "@/components/Toast";
import { PrintButton, PrintHeader } from "@/components/PrintHeader";
import { performAction } from "@/lib/actions";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { useDocument, useTransfersFor } from "@/lib/hooks";
import { useI18n, type TKey } from "@/lib/i18n";
import type { SupplyList } from "@/lib/types";

export default function SupplyDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const toast = useToast();
  const d = useDocument<SupplyList>("supplyLists", id);
  const transfers = useTransfersFor(id);
  const [editing, setEditing] = useState(false);

  if (d === undefined) return <p className="text-muted">{t("loading")}</p>;
  if (d === null || !profile) return <p className="text-muted">{t("detail.notFound")}</p>;

  const canEdit = profile.role === "chef" && d.status === "returned_to_chef";

  if (editing && canEdit)
    return (
      <div className="space-y-6">
        <h1 className="h1">{t("supply.edit")}</h1>
        <SupplyForm
          initial={d}
          submitLabel={t("supply.saveResend")}
          onCancel={() => setEditing(false)}
          onSubmit={async (data, note) => {
            await performAction("supply", d.id, data.title, profile, "resubmit", note, { ...data });
            setEditing(false);
            toast({ text: t("action.resubmit") + " ✓", tone: "success" });
          }}
        />
      </div>
    );

  return (
    <div className="space-y-6">
      <PrintHeader heading={t("dash.supplyLists")} />
      <div className="no-print flex items-center justify-between gap-3">
        <Link href="/dashboard" className="text-sm text-muted hover:text-forest">← {t("back")}</Link>
        <PrintButton />
      </div>

      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-wide text-muted uppercase">{t("dash.supplyLists")}</p>
            <h1 className="h1">{d.title}</h1>
          </div>
          <StatusBadge status={d.status} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Info label={t("supply.date")} value={formatDate(d.eventDate, lang)} />
          <Info label={t("supply.meal")} value={t(`meal.${d.meal}` as TKey)} />
          <Info label={t("supply.guests")} value={String(d.guestCount)} />
          <Info label={t("detail.createdBy")} value={d.createdByName} />
        </dl>
        {d.dishes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {d.dishes.map((x) => (
              <span key={x.id} className="rounded-full bg-mist px-3 py-1 text-xs">{x.name}</span>
            ))}
          </div>
        )}
      </div>

      <div className="print-full grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card overflow-x-auto">
            <h2 className="h2 mb-3">{t("supply.items")} ({d.items.length})</h2>
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-mist text-left text-xs text-muted uppercase">
                  <th className="py-2 pr-2">{t("supply.item")}</th>
                  <th className="py-2 pr-2">{t("supply.qty")}</th>
                  <th className="py-2 pr-2">{t("supply.calc")}</th>
                  <th className="py-2">{t("supply.note")}</th>
                </tr>
              </thead>
              <tbody>
                {d.items.map((it, i) => {
                  const changed = it.calculated != null && it.qty !== it.calculated;
                  return (
                    <tr key={i} className={`border-b border-mist/60 ${changed ? "bg-amber/10" : ""}`}>
                      <td className="py-2 pr-2 font-medium">{it.name}</td>
                      <td className="py-2 pr-2 whitespace-nowrap">{it.qty} {it.unit}</td>
                      <td className="py-2 pr-2 whitespace-nowrap text-muted">
                        {it.calculated != null ? `${it.calculated} ${it.unit}` : "—"}
                      </td>
                      <td className="py-2 text-muted">{it.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {d.status === "approved" && (
            <div className="card">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="h2">{t("transfer.linked")}</h2>
                {profile.role === "chef" && (
                  <Link href={`/leftovers/new?supply=${d.id}`} className="btn-primary">
                    + {t("supply.recordLeftovers")}
                  </Link>
                )}
              </div>
              {(transfers.data ?? []).length === 0 ? (
                <p className="text-sm text-muted">{t("dash.empty")}</p>
              ) : (
                <ul className="divide-y divide-mist">
                  {transfers.data!.map((x) => (
                    <li key={x.id}>
                      <Link href={`/leftovers/${x.id}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <span>
                          {formatDate(x.date, lang)} ·{" "}
                          {t("transfer.summary", {
                            guests: x.guestCount,
                            portions: x.items.reduce((s, i) => s + (Number(i.portions) || 0), 0),
                          })}
                        </span>
                        <StatusBadge status={x.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <ActionPanel kind="supply" id={d.id} title={d.title} status={d.status}>
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
