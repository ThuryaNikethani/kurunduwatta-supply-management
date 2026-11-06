"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { TransferForm } from "@/components/TransferForm";
import { createWorkflowDoc } from "@/lib/actions";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { useDocument } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import type { SupplyList } from "@/lib/types";

export default function NewTransferPage() {
  return (
    <Suspense>
      <NewTransfer />
    </Suspense>
  );
}

function NewTransfer() {
  const supplyId = useSearchParams().get("supply") ?? "";
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const router = useRouter();
  const supply = useDocument<SupplyList>("supplyLists", supplyId || "_");

  if (supply === undefined) return <p className="text-muted">{t("loading")}</p>;
  if (!supply || !profile || profile.role !== "chef")
    return <p className="text-muted">{t("detail.notFound")}</p>;
  if (supply.status !== "approved") return <p className="text-muted">{t("transfer.onlyApproved")}</p>;

  return (
    <div className="space-y-6">
      <Link href={`/requests/${supply.id}`} className="text-sm text-muted hover:text-forest">← {t("back")}</Link>
      <div>
        <h1 className="h1">{t("transfer.new")}</h1>
        <p className="mt-1 text-muted">
          {t("transfer.for")}: <span className="font-medium text-forest">{supply.title}</span> ·{" "}
          {formatDate(supply.eventDate, lang)} · {supply.guestCount} {t("supply.guests")}
        </p>
      </div>
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
          router.replace(`/leftovers/${id}`);
        }}
      />
    </div>
  );
}
