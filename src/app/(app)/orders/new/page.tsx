"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/common";
import { BackBar } from "@/components/DetailBits";
import { OrderForm } from "@/components/OrderForm";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { useDoc, useStock, useStockIssue } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { createOrder } from "@/lib/orders";
import { lowStockOrder, previewIssue, shortagesAfterIssue, shortagesToOrder } from "@/lib/stock";

export default function NewOrderPage() {
  return (
    <Suspense>
      <NewOrder />
    </Suspense>
  );
}

/** ?low=1 → start with everything running low; ?supply=<id> → what that list is short of. */
function NewOrder() {
  const params = useSearchParams();
  const supplyId = params.get("supply");
  const wantLow = params.get("low") === "1";
  const { profile } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const stock = useStock();
  const supply = useDoc("supply", supplyId);
  const issue = useStockIssue(supplyId ?? "");

  if (!profile) return null;
  if (profile.role !== "supervisor") return <EmptyState text={t("detail.notFound")} />;
  if (!stock || supply === undefined || (supply && issue === undefined)) return <Skeleton className="h-96" />;

  // Already issued → what stock couldn't cover; not yet → what it would be short of.
  const items = supply
    ? issue
      ? shortagesAfterIssue(supply.items, issue, stock)
      : shortagesToOrder(previewIssue(supply.items, stock))
    : wantLow
      ? lowStockOrder(stock)
      : [];

  return (
    <div className="grid gap-6">
      <BackBar href={supply ? `/requests/${supply.id}` : "/orders"} />
      <PageHeader eyebrow={supply ? `${t("orders.fromList")} · ${supply.title}` : t("orders.title")} title={t("orders.new")} />
      <OrderForm
        initial={{ items }}
        submitLabel={t("orders.send")}
        onSubmit={async (data, note) => {
          const id = await createOrder(profile, data, note);
          toast.success(t("did.po_submit"));
          router.replace(`/orders/${id}`);
        }}
      />
    </div>
  );
}
