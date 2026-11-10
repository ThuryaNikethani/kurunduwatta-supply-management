"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { CalendarDays, Users } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/common";
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
    <div className="grid gap-6">
      <BackBar href={`/requests/${supply.id}`} />
      <PageHeader
        eyebrow={t("transfer.new")}
        title={supply.title}
        subtitle={
          <span className="flex flex-wrap gap-4">
            <span className="inline-flex items-center gap-1"><CalendarDays className="size-4" /> {formatDate(supply.eventDate)}</span>
            <span className="inline-flex items-center gap-1"><Users className="size-4" /> {t("people", { n: supply.guestCount })}</span>
          </span>
        }
      />
      <TransferForm
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
