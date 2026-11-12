"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common";
import { BackBar } from "@/components/DetailBits";
import { TransferForm } from "@/components/TransferForm";
import { Skeleton } from "@/components/ui/skeleton";
import { createWorkflowDoc } from "@/lib/actions";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { useDoc } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";

export default function NewTransferPage() {
  return (
    <Suspense>
      <NewTransfer />
    </Suspense>
  );
}

function NewTransfer() {
  const supplyId = useSearchParams().get("supply");
  const { profile } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const supply = useDoc("supply", supplyId);

  if (supply === undefined) return <Skeleton className="h-96" />;
  if (!supply || !profile || profile.role !== "chef") return <EmptyState text={t("detail.notFound")} />;
  if (supply.status !== "approved") return <EmptyState text={t("transfer.onlyApproved")} />;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4 [&>*]:min-w-0">
      <BackBar href={`/requests/${supply.id}`} />
      <div className="grid gap-1">
        <h1 className="font-display text-3xl font-semibold">{t("transfer.new")}</h1>
        <p className="text-muted-foreground">{supply.title} · {formatDate(supply.eventDate)} · {t("people", { n: supply.guestCount })}</p>
      </div>
      <TransferForm
        draftKey={`transfer-new-${supply.id}`}
        dishOptions={supply.dishes.map((d) => d.name)}
        guestCount={supply.guestCount}
        submitLabel={t("supply.send")}
        onSubmit={async (data, note) => {
          const id = await createWorkflowDoc(
            "transfer",
            profile,
            { ...data, supplyId: supply.id, supplyTitle: supply.title, guestCount: supply.guestCount },
            note,
          );
          toast.success(t("did.submit"));
          router.replace(`/leftovers/${id}`);
        }}
      />
    </div>
  );
}
