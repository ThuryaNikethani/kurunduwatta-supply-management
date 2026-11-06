"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Hourglass,
  Inbox,
  Plus,
  Search,
  Soup,
  Users,
  type LucideIcon,
} from "lucide-react";
import { CardsSkeleton, EmptyState, PageHeader } from "@/components/common";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { useSupplyLists, useTransferOuts } from "@/lib/hooks";
import { useI18n, type TKey } from "@/lib/i18n";
import { STATUSES, type Status, type SupplyList, type TransferOut } from "@/lib/types";
import { cn } from "@/lib/utils";
import { WAITING_ON } from "@/lib/workflow";

export default function Dashboard() {
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const supply = useSupplyLists();
  const transfers = useTransferOuts();
  const [filter, setFilter] = useState<Status | "all">("all");
  const [search, setSearch] = useState("");

  const role = profile?.role;
  const mine = (s: Status) => WAITING_ON[s] === role;
  const s = useMemo(() => supply.data ?? [], [supply.data]);
  const tr = useMemo(() => transfers.data ?? [], [transfers.data]);

  const stats = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    const all = [...s, ...tr];
    return {
      waiting: all.filter((d) => WAITING_ON[d.status] === role).length,
      review: all.filter((d) => d.status !== "approved").length,
      approved: s.filter((d) => d.status === "approved").length,
      leftovers: tr.filter((d) => d.date.startsWith(month)).reduce((n, d) => n + d.items.reduce((a, i) => a + i.portions, 0), 0),
    };
  }, [s, tr, role]);

  if (!profile) return null;

  const waitingSupply = s.filter((d) => mine(d.status));
  const waitingTransfer = tr.filter((d) => mine(d.status));

  const q = search.trim().toLowerCase();
  const match = (d: SupplyList | TransferOut) =>
    (filter === "all" || d.status === filter) &&
    (!q || ("title" in d ? d.title : d.supplyTitle).toLowerCase().includes(q) || d.createdByName.toLowerCase().includes(q));

  const error = supply.error || transfers.error;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow={t(`role.${profile.role}`)}
        title={t("dash.hello", { name: profile.name.split(/[\s(]/)[0] })}
        subtitle={formatDate(Date.now(), lang)}
        actions={
          profile.role === "chef" && (
            <Button asChild variant="accent" size="lg">
              <Link href="/requests/new"><Plus /> {t("supply.new")}</Link>
            </Button>
          )
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{t("error")} ({error.message})</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat Icon={Inbox} label={t("stat.waiting")} value={stats.waiting} highlight={stats.waiting > 0} />
        <Stat Icon={Hourglass} label={t("stat.inReview")} value={stats.review} />
        <Stat Icon={CheckCircle2} label={t("stat.approved")} value={stats.approved} />
        <Stat Icon={Soup} label={t("stat.leftovers")} value={stats.leftovers} />
      </div>

      <section className="grid gap-3">
        <h2 className="font-display text-2xl font-semibold">{t("dash.needsAction")}</h2>
        {!supply.data || !transfers.data ? (
          <CardsSkeleton count={2} />
        ) : waitingSupply.length + waitingTransfer.length === 0 ? (
          <EmptyState icon={CheckCircle2} text={t("dash.nothing")} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {waitingSupply.map((d) => <SupplyRow key={d.id} d={d} highlight />)}
            {waitingTransfer.map((d) => <TransferRow key={d.id} d={d} highlight />)}
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="font-display text-2xl font-semibold">{t("dash.recent")}</h2>
        <Tabs defaultValue="supply" className="gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <TabsList>
              <TabsTrigger value="supply"><ClipboardList /> {t("dash.supplyLists")}</TabsTrigger>
              <TabsTrigger value="transfer"><Soup /> {t("dash.transfers")}</TabsTrigger>
            </TabsList>
            <div className="relative min-w-40 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="bg-card pl-9" placeholder={t("dash.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as Status | "all")}>
              <SelectTrigger className="w-auto bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("dash.all")}</SelectItem>
                {STATUSES.map((st) => <SelectItem key={st} value={st}>{t(`status.${st}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <TabsContent value="supply">
            <List loading={!supply.data} items={s.filter(match)} render={(d) => <SupplyRow key={d.id} d={d as SupplyList} />} />
          </TabsContent>
          <TabsContent value="transfer">
            <List loading={!transfers.data} items={tr.filter(match)} render={(d) => <TransferRow key={d.id} d={d as TransferOut} />} />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

function List({ loading, items, render }: {
  loading: boolean; items: (SupplyList | TransferOut)[]; render: (d: SupplyList | TransferOut) => React.ReactNode;
}) {
  const { t } = useI18n();
  if (loading) return <CardsSkeleton />;
  if (!items.length) return <EmptyState text={t("dash.empty")} />;
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map(render)}</div>;
}

function Stat({ Icon, label, value, highlight }: {
  Icon: LucideIcon; label: string; value: number; highlight?: boolean;
}) {
  return (
    <Card className={cn("gap-0 py-4", highlight && "border-amber/60 bg-amber/10")}>
      <CardContent className="flex items-center gap-3 px-4">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", highlight ? "bg-amber text-forest" : "bg-secondary text-moss")}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-3xl leading-none font-semibold">{value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ href, title, status, highlight, tag, Icon, meta }: {
  href: string; title: string; status: Status; highlight?: boolean; tag: TKey; Icon: LucideIcon;
  meta: { Icon: LucideIcon; text: string }[];
}) {
  const { t } = useI18n();
  return (
    <Link href={href} className="group">
      <Card className={cn("h-full gap-3 py-4 transition group-hover:-translate-y-0.5 group-hover:shadow-md", highlight && "border-amber/60 ring-2 ring-amber/25")}>
        <CardContent className="grid gap-3 px-4">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11px] tracking-wide text-muted-foreground uppercase">
              <Icon className="size-3.5" /> {t(tag)}
            </span>
            <StatusBadge status={status} />
          </div>
          <p className="font-display text-xl leading-snug font-semibold">{title}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {meta.map((m, i) => (
              <span key={i} className="inline-flex items-center gap-1"><m.Icon className="size-3.5" /> {m.text}</span>
            ))}
            <ChevronRight className="ml-auto size-4 transition group-hover:translate-x-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function SupplyRow({ d, highlight }: { d: SupplyList; highlight?: boolean }) {
  const { t, lang } = useI18n();
  return (
    <Row href={`/requests/${d.id}`} title={d.title} tag="dash.supplyLists" Icon={ClipboardList} status={d.status} highlight={highlight}
      meta={[
        { Icon: CalendarDays, text: `${formatDate(d.eventDate, lang)} · ${t(`meal.${d.meal}` as TKey)}` },
        { Icon: Users, text: String(d.guestCount) },
        { Icon: ClipboardList, text: t("supply.totalItems", { n: d.items.length }) },
      ]} />
  );
}

function TransferRow({ d, highlight }: { d: TransferOut; highlight?: boolean }) {
  const { t, lang } = useI18n();
  const portions = d.items.reduce((s, i) => s + (Number(i.portions) || 0), 0);
  return (
    <Row href={`/leftovers/${d.id}`} title={d.supplyTitle} tag="dash.transfers" Icon={Soup} status={d.status} highlight={highlight}
      meta={[
        { Icon: CalendarDays, text: formatDate(d.date, lang) },
        { Icon: Soup, text: t("transfer.summary", { guests: d.guestCount, portions }) },
      ]} />
  );
}
