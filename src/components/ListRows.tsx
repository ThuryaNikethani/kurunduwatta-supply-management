"use client";

import Link from "next/link";
import { ChevronRight, ClipboardList, Soup, type LucideIcon } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import { useI18n, type TKey } from "@/lib/i18n";
import type { SupplyList, TransferOut } from "@/lib/types";

/** One line per list: name, a short detail, and its status colour. */
function Row({ href, title, Icon, meta, badge }: { href: string; title: string; Icon: LucideIcon; meta: string; badge: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl border bg-card p-3 transition hover:border-amber/60">
      <Icon className="size-6 shrink-0 text-moss" />
      <span className="grid min-w-0 flex-1 gap-1">
        <span className="truncate text-base font-semibold">{title}</span>
        <span className="truncate text-sm text-muted-foreground">{meta}</span>
        <span>{badge}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}

export function SupplyRow({ d }: { d: SupplyList }) {
  const { t } = useI18n();
  return (
    <Row href={`/requests/${d.id}`} title={d.title} Icon={ClipboardList} badge={<StatusBadge status={d.status} />}
      meta={[formatDate(d.eventDate), d.audience !== "staff" && t(`meal.${d.meal}` as TKey), t("supply.calcFor", { n: d.guestCount, d: d.days ?? 1 })]
        .filter(Boolean).join(" · ")} />
  );
}

export function TransferRow({ d }: { d: TransferOut }) {
  const { t } = useI18n();
  const portions = d.items.reduce((s, i) => s + (Number(i.portions) || 0), 0);
  return (
    <Row href={`/leftovers/${d.id}`} title={d.supplyTitle} Icon={Soup} badge={<StatusBadge status={d.status} />}
      meta={`${formatDate(d.date)} · ${t("transfer.summary", { guests: d.guestCount, portions })}`} />
  );
}
