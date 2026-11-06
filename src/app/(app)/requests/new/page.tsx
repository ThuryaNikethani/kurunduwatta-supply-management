"use client";

import { useRouter } from "next/navigation";
import { SupplyForm } from "@/components/SupplyForm";
import { createWorkflowDoc } from "@/lib/actions";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function NewSupplyList() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  if (!profile) return null;
  if (profile.role !== "chef") return <p className="text-muted">{t("detail.notFound")}</p>;

  return (
    <div className="space-y-6">
      <h1 className="h1">{t("supply.new")}</h1>
      <SupplyForm
        submitLabel={t("supply.send")}
        onSubmit={async (data, note) => {
          const id = await createWorkflowDoc("supply", profile, { ...data }, note);
          router.replace(`/requests/${id}`);
        }}
      />
    </div>
  );
}
