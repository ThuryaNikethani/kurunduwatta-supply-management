"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, ChevronRight, ClipboardList, Plus, Search, ShoppingCart, Soup, type LucideIcon } from "lucide-react";
import { CardsSkeleton } from "@/components/common";
import { StatusBadge } from "@/components/StatusBadge";
import { OrderBadge } from "@/components/OrderBadge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { useOrders, useRecipes, useSupplyLists, useTransferOuts } from "@/lib/hooks";
import { ORDER_WAITING_ON } from "@/lib/orders";
import { errorText, useI18n, type TKey } from "@/lib/i18n";
import type { SupplyList, TransferOut } from "@/lib/types";
import { WAITING_ON } from "@/lib/workflow";

/** Home: new list button (chef), what is waiting for you, then every list. */
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
  const waitingOrders = (orders.data ?? []).filter((o) => ORDER_WAITING_ON[o.status] === role);
  const waiting = s.filter(mine).length + tr.filter(mine).length + waitingOrders.length;
  const toCheck = (recipes.data ?? []).filter((r) => !r.reviewed && r.ingredients.length).length;

  const q = search.trim().toLowerCase();
  const match = (d: SupplyList | TransferOut) =>
    !q || ("title" in d ? d.title : d.supplyTitle).toLowerCase().includes(q) || d.createdByName.toLowerCase().includes(q);
  const error = supply.error || transfers.error;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <h1 className="font-display text-3xl font-semibold">{t("dash.hello", { name: profile.name.split(/[\s(]/)[0] })}</h1>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{errorText(error)}</AlertDescription>
        </Alert>
      )}

      {role === "chef" && (
        <Button asChild variant="accent" className="h-16 w-full text-xl">
          <Link href="/requests/new"><Plus className="size-6" /> {t("supply.new")}</Link>
        </Button>
      )}

      {role === "chef" && toCheck > 0 && (
        <Link href="/recipes" className="flex items-center gap-2 text-sm text-amber-deep underline underline-offset-4">
          <BookOpen className="size-4" /> {t("recipes.reminder", { n: toCheck })}
        </Link>
      )}

      <Card>
        <CardContent className="grid gap-3">
          <p className="text-lg font-semibold">
            {t("dash.needsAction")} {waiting > 0 && <span className="ml-1 rounded-full bg-amber px-2.5 py-0.5 text-forest">{waiting}</span>}
          </p>
          {!supply.data || !transfers.data ? (
            <CardsSkeleton count={1} />
          ) : waiting === 0 ? (
            <p className="text-muted-foreground">{t("dash.nothing")}</p>
          ) : (
            <div className="grid gap-2">
              {s.filter(mine).map((d) => <SupplyRow key={d.id} d={d} />)}
              {tr.filter(mine).map((d) => <TransferRow key={d.id} d={d} />)}
              {waitingOrders.map((o) => (
                <Row key={o.id} href={`/orders/${o.id}`} Icon={ShoppingCart} title={o.supplier}
                  badge={<OrderBadge status={o.status} />} meta={`${formatDate(o.createdAt)} · ${t("orders.itemCount", { n: o.items.length })}`} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-3">
          <p className="text-lg font-semibold">{t("dash.recent")}</p>
          <Tabs defaultValue="supply" className="gap-3">
            <TabsList className="w-full">
              <TabsTrigger value="supply"><ClipboardList /> {t("dash.supplyLists")}</TabsTrigger>
              <TabsTrigger value="transfer"><Soup /> {t("dash.transfers")}</TabsTrigger>
            </TabsList>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-10" placeholder={t("dash.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <TabsContent value="supply" className="grid gap-2">
              {!supply.data ? <CardsSkeleton count={2} /> : s.filter(match).length === 0
                ? <p className="text-muted-foreground">{t("dash.empty")}</p>
                : s.filter(match).map((d) => <SupplyRow key={d.id} d={d} />)}
            </TabsContent>
            <TabsContent value="transfer" className="grid gap-2">
              {!transfers.data ? <CardsSkeleton count={2} /> : tr.filter(match).length === 0
                ? <p className="text-muted-foreground">{t("dash.empty")}</p>
                : tr.filter(match).map((d) => <TransferRow key={d.id} d={d} />)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

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

function SupplyRow({ d }: { d: SupplyList }) {
  const { t } = useI18n();
  return (
    <Row href={`/requests/${d.id}`} title={d.title} Icon={ClipboardList} badge={<StatusBadge status={d.status} />}
      meta={[formatDate(d.eventDate), d.audience !== "staff" && t(`meal.${d.meal}` as TKey), t("supply.calcFor", { n: d.guestCount, d: d.days ?? 1 })]
        .filter(Boolean).join(" · ")} />
  );
}

function TransferRow({ d }: { d: TransferOut }) {
  const { t } = useI18n();
  const portions = d.items.reduce((s, i) => s + (Number(i.portions) || 0), 0);
  return (
    <Row href={`/leftovers/${d.id}`} title={d.supplyTitle} Icon={Soup} badge={<StatusBadge status={d.status} />}
      meta={`${formatDate(d.date)} · ${t("transfer.summary", { guests: d.guestCount, portions })}`} />
  );
}
