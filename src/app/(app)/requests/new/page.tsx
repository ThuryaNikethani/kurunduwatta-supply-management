"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EmptyState } from "@/components/common";
import { SupplyForm } from "@/components/SupplyForm";
import { createWorkflowDoc } from "@/lib/actions";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function NewSupplyList() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  if (!profile) return null;
  if (profile.role !== "chef") return <EmptyState text={t("detail.notFound")} />;

  return (
    <div className="grid gap-6">
      <SupplyForm
        draftKey="supply-new"
        submitLabel={t("supply.send")}
        onSubmit={async (data, note) => {
          const id = await createWorkflowDoc("supply", profile, data, note);
          toast.success(t("did.submit"));
          router.replace(`/requests/${id}`);
        }}
      />
    </div>
  );
}
