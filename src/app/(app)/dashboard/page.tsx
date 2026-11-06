"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { useSupplyLists, useTransferOuts } from "@/lib/hooks";
import { useI18n, type TKey } from "@/lib/i18n";
import { STATUSES, type Status, type SupplyList, type TransferOut } from "@/lib/types";
import { WAITING_ON } from "@/lib/workflow";

type Tab = "supply" | "transfer";

export default function Dashboard() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const supply = useSupplyLists();
  const transfers = useTransferOuts();
  const [tab, setTab] = useState<Tab>("supply");
  const [filter, setFilter] = useState<Status | "all">("all");

  if (!profile) return null;
  const role = profile.role;
  const mine = (s: Status) => WAITING_ON[s] === role;

  const waitingSupply = (supply.data ?? []).filter((d) => mine(d.status));
  const waitingTransfer = (transfers.data ?? []).filter((d) => mine(d.status));

  const list: (SupplyList | TransferOut)[] = (tab === "supply" ? supply.data : transfers.data) ?? [];
  const shown = filter === "all" ? list : list.filter((d) => d.status === filter);
  const loading = tab === "supply" ? !supply.data : !transfers.data;
  const error = supply.error || transfers.error;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="h1">{t("nav.dashboard")}</h1>
        {role === "chef" && (
          <Link href="/requests/new" className="btn-primary">+ {t("supply.new")}</Link>
        )}
      </div>

      {error && <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{t("error")} ({error.message})</p>}

      <section>
        <h2 className="h2 mb-3">{t("dash.needsAction")}</h2>
        {waitingSupply.length + waitingTransfer.length === 0 ? (
          <p className="card text-sm text-muted">{t("dash.nothing")}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {waitingSupply.map((d) => <SupplyRow key={d.id} d={d} highlight />)}
            {waitingTransfer.map((d) => <TransferRow key={d.id} d={d} highlight />)}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {(["supply", "transfer"] as Tab[]).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-full px-4 py-1.5 text-sm ${tab === k ? "bg-forest text-cream" : "bg-mist text-forest"}`}
            >
              {t(k === "supply" ? "dash.supplyLists" : "dash.transfers")}
            </button>
          ))}
          <select
            className="input ml-auto w-auto"
            value={filter}
            onChange={(e) => setFilter(e.target.value as Status | "all")}
          >
            <option value="all">{t("dash.all")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{t(`status.${s}`)}</option>
            ))}
          </select>
        </div>
        {loading ? (
          <p className="text-sm text-muted">{t("loading")}</p>
        ) : shown.length === 0 ? (
          <p className="card text-sm text-muted">{t("dash.empty")}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tab === "supply"
              ? (shown as SupplyList[]).map((d) => <SupplyRow key={d.id} d={d} />)
              : (shown as TransferOut[]).map((d) => <TransferRow key={d.id} d={d} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function Row({
  href, title, meta, status, highlight, tag,
}: {
  href: string; title: string; meta: string; status: Status; highlight?: boolean; tag: TKey;
}) {
  const { t } = useI18n();
  return (
    <Link
      href={href}
      className={`card block transition hover:shadow-md ${highlight ? "border-amber ring-1 ring-amber/40" : ""}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-[11px] tracking-wide text-muted uppercase">{t(tag)}</span>
        <StatusBadge status={status} />
      </div>
      <p className="font-display text-xl leading-snug font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted">{meta}</p>
    </Link>
  );
}

function SupplyRow({ d, highlight }: { d: SupplyList; highlight?: boolean }) {
  const { t, lang } = useI18n();
  return (
    <Row
      href={`/requests/${d.id}`}
      title={d.title}
      tag="dash.supplyLists"
      status={d.status}
      highlight={highlight}
      meta={`${formatDate(d.eventDate, lang)} · ${t(`meal.${d.meal}` as TKey)} · ${d.guestCount} ${t("supply.guests")} · ${d.items.length} ${t("supply.items")}`}
    />
  );
}

function TransferRow({ d, highlight }: { d: TransferOut; highlight?: boolean }) {
  const { t, lang } = useI18n();
  const portions = d.items.reduce((s, i) => s + (Number(i.portions) || 0), 0);
  return (
    <Row
      href={`/leftovers/${d.id}`}
      title={d.supplyTitle}
      tag="dash.transfers"
      status={d.status}
      highlight={highlight}
      meta={`${formatDate(d.date, lang)} · ${t("transfer.summary", { guests: d.guestCount, portions })}`}
    />
  );
}
