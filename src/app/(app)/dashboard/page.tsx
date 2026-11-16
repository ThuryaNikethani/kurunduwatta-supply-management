"use client";

import { useState } from "react";
import { ClipboardList, Search, Soup } from "lucide-react";
import { CardsSkeleton } from "@/components/common";
import { SupplyRow, TransferRow } from "@/components/ListRows";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { useSupplyLists, useTransferOuts } from "@/lib/hooks";
import { errorText, useI18n } from "@/lib/i18n";
import type { SupplyList, TransferOut } from "@/lib/types";
import { WAITING_ON } from "@/lib/workflow";

/** HR's home: what is waiting for HR, then every list. (Chefs and supervisors have no home page.) */
export default function Dashboard() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const supply = useSupplyLists();
  const transfers = useTransferOuts();
  const [search, setSearch] = useState("");

  if (!profile) return null;
  const role = profile.role;
  const s = supply.data ?? [];
  const tr = transfers.data ?? [];
  const mine = (d: SupplyList | TransferOut) => WAITING_ON[d.status] === role;
  const waiting = s.filter(mine).length + tr.filter(mine).length;

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
