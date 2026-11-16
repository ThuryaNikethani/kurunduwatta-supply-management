"use client";

import { CardsSkeleton } from "@/components/common";
import { SupplyRow, TransferRow } from "@/components/ListRows";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useSupplyLists, useTransferOuts } from "@/lib/hooks";
import { errorText, useI18n } from "@/lib/i18n";
import type { SupplyList, TransferOut } from "@/lib/types";
import { WAITING_ON } from "@/lib/workflow";

/** The supervisor's page: only the lists waiting for them, nothing else. */
export default function WorkPage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const supply = useSupplyLists();
  const transfers = useTransferOuts();

  if (!profile) return null;
  const mine = (d: SupplyList | TransferOut) => WAITING_ON[d.status] === profile.role;
  const s = (supply.data ?? []).filter(mine);
  const tr = (transfers.data ?? []).filter(mine);
  const waiting = s.length + tr.length;
  const error = supply.error || transfers.error;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <h1 className="font-display text-3xl font-semibold">
        {t("nav.work")} {waiting > 0 && <span className="ml-1 rounded-full bg-amber px-3 py-0.5 align-middle text-xl text-forest">{waiting}</span>}
      </h1>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{errorText(error)}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardContent className="grid gap-2">
          {!supply.data || !transfers.data ? (
            <CardsSkeleton count={2} />
          ) : waiting === 0 ? (
            <p className="py-6 text-center text-lg text-muted-foreground">{t("dash.nothing")}</p>
          ) : (
            <>
              {s.map((d) => <SupplyRow key={d.id} d={d} />)}
              {tr.map((d) => <TransferRow key={d.id} d={d} />)}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
