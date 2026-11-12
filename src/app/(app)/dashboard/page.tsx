"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, CheckCircle2, ChevronRight, ClipboardList, Plus, Search, ShoppingCart, Soup, type LucideIcon } from "lucide-react";
import { AudienceBadge, CardsSkeleton } from "@/components/common";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { useOrders, useRecipes, useSupplyLists, useTransferOuts } from "@/lib/hooks";
import { ORDER_WAITING_ON } from "@/lib/orders";
import { OrderBadge } from "@/components/OrderBadge";
import { errorText, useI18n, type TKey } from "@/lib/i18n";
import type { SupplyList, TransferOut } from "@/lib/types";
import { cn } from "@/lib/utils";
import { WAITING_ON } from "@/lib/workflow";

/** Home: a big "new list" button for the chef, what needs you, then everything else. */
export default function Dashboard() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const supply = useSupplyLists();
  const transfers = useTransferOuts();
  const recipes = useRecipes();
  const orders = useOrders();
  const [search, setSearch] = useState("");

  if (!profile) return null;
  const role = profile.role;
  const s = supply.data ?? [];
  const tr = transfers.data ?? [];
  const mine = (d: SupplyList | TransferOut) => WAITING_ON[d.status] === role;

  const waitingSupply = s.filter(mine);
  const waitingTransfer = tr.filter(mine);
  const waitingOrders = (orders.data ?? []).filter((o) => ORDER_WAITING_ON[o.status] === role);
  const waiting = waitingSupply.length + waitingTransfer.length + waitingOrders.length;
  const toReview = (recipes.data ?? []).filter((r) => !r.reviewed && r.ingredients.length).length;

  const q = search.trim().toLowerCase();
  const match = (d: SupplyList | TransferOut) =>
    !q || ("title" in d ? d.title : d.supplyTitle).toLowerCase().includes(q) || d.createdByName.toLowerCase().includes(q);

  const error = supply.error || transfers.error;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-7">
      <div>
        <h1 className="font-display text-3xl font-semibold">{t("dash.hello", { name: profile.name.split(/[\s(]/)[0] })}</h1>
        <p className="text-sm text-muted-foreground">{formatDate(Date.now())}</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{errorText(error)}</AlertDescription>
        </Alert>
      )}

      {role === "chef" && (
        <Link href="/requests/new"
          className="flex items-center gap-4 rounded-2xl bg-amber p-5 text-forest shadow-sm transition hover:bg-amber-light">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-forest text-amber">
            <Plus className="size-8" />
          </span>
          <span className="text-2xl font-semibold">{t("supply.new")}</span>
          <ChevronRight className="ml-auto size-6" />
        </Link>
      )}

      {role === "chef" && toReview > 0 && (
        <Link href="/recipes?filter=todo" className="flex items-center gap-3 rounded-xl border border-amber/60 bg-amber/10 p-3 text-sm">
          <BookOpen className="size-5 shrink-0 text-amber-deep" />
          <span className="min-w-0 flex-1">{t("dash.recipesTodo", { n: toReview })}</span>
          <ChevronRight className="size-4" />
        </Link>
      )}

      <section className="grid gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          {t("dash.needsAction")}
          {waiting > 0 && <span className="rounded-full bg-amber px-2.5 py-0.5 text-base text-forest">{waiting}</span>}
        </h2>
        {!supply.data || !transfers.data ? (
          <CardsSkeleton count={2} />
        ) : waiting === 0 ? (
          <p className="flex items-center gap-2 rounded-xl border border-dashed p-4 text-muted-foreground">
            <CheckCircle2 className="size-5 text-leaf-deep" /> {t("dash.nothing")}
          </p>
        ) : (
          <div className="grid gap-2">
            {waitingSupply.map((d) => <SupplyRow key={d.id} d={d} highlight />)}
            {waitingTransfer.map((d) => <TransferRow key={d.id} d={d} highlight />)}
            {waitingOrders.map((o) => (
              <Row key={o.id} href={`/orders/${o.id}`} Icon={ShoppingCart} title={o.supplier} highlight
                badge={<OrderBadge status={o.status} />}
                meta={`${formatDate(o.createdAt)} · ${t("orders.itemCount", { n: o.items.length })}`} />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">{t("dash.recent")}</h2>
        <Tabs defaultValue="supply" className="gap-3">
          <TabsList className="w-full">
            <TabsTrigger value="supply"><ClipboardList /> {t("dash.supplyLists")}</TabsTrigger>
            <TabsTrigger value="transfer"><Soup /> {t("dash.transfers")}</TabsTrigger>
          </TabsList>
          {s.length + tr.length > 8 && (
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-11 bg-card pl-9" placeholder={t("dash.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          )}
          <TabsContent value="supply">
            <List loading={!supply.data} count={s.filter(match).length}>
              {s.filter(match).map((d) => <SupplyRow key={d.id} d={d} />)}
            </List>
          </TabsContent>
          <TabsContent value="transfer">
            <List loading={!transfers.data} count={tr.filter(match).length}>
              {tr.filter(match).map((d) => <TransferRow key={d.id} d={d} />)}
            </List>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

function List({ loading, count, children }: { loading: boolean; count: number; children: React.ReactNode }) {
  const { t } = useI18n();
  if (loading) return <CardsSkeleton />;
  if (!count) return <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">{t("dash.empty")}</p>;
  return <div className="grid gap-2">{children}</div>;
}

/** One tappable line: icon, name, status, and a short detail line. */
function Row({ href, title, highlight, Icon, meta, badge, extra }: {
  href: string; title: string; highlight?: boolean; Icon: LucideIcon; meta: string; badge: React.ReactNode; extra?: React.ReactNode;
}) {
  return (
    <Link href={href}
      className={cn("flex items-center gap-3 rounded-xl border bg-card p-3 transition hover:border-amber/60",
        highlight && "border-amber/70 ring-2 ring-amber/25")}>
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full", highlight ? "bg-amber text-forest" : "bg-secondary text-moss")}>
        <Icon className="size-5" />
      </span>
      <span className="grid min-w-0 flex-1 gap-1">
        <span className="truncate text-base font-semibold">{title}</span>
        <span className="flex flex-wrap items-center gap-1.5">{badge}{extra}</span>
        <span className="truncate text-xs text-muted-foreground">{meta}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function SupplyRow({ d, highlight }: { d: SupplyList; highlight?: boolean }) {
  const { t } = useI18n();
  return (
    <Row href={`/requests/${d.id}`} title={d.title} Icon={ClipboardList} highlight={highlight}
      badge={<StatusBadge status={d.status} />} extra={<AudienceBadge audience={d.audience} />}
      meta={[
        formatDate(d.eventDate),
        d.audience !== "staff" && t(`meal.${d.meal}` as TKey),
        t("supply.calcFor", { n: d.guestCount, d: d.days ?? 1 }),
      ].filter(Boolean).join(" · ")} />
  );
}

function TransferRow({ d, highlight }: { d: TransferOut; highlight?: boolean }) {
  const { t } = useI18n();
  const portions = d.items.reduce((s, i) => s + (Number(i.portions) || 0), 0);
  return (
    <Row href={`/leftovers/${d.id}`} title={d.supplyTitle} Icon={Soup} highlight={highlight}
      badge={<StatusBadge status={d.status} />}
      meta={`${formatDate(d.date)} · ${t("transfer.summary", { guests: d.guestCount, portions })}`} />
  );
}
