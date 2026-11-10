"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

/** Villa letterhead shown only on the printed / PDF copy. */
export function PrintHeader({ heading }: { heading: string }) {
  const { t } = useI18n();
  return (
    <div className="print-only mb-6 border-b-2 border-forest pb-3">
      <p className="font-display text-3xl font-semibold">{t("villa")}</p>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{heading}</span>
        <span>
          {t("print.printed")}: {formatDateTime(Date.now())}
        </span>
      </div>
    </div>
  );
}

export function PrintButton() {
  const { t } = useI18n();
  return (
    <Button variant="outline" className="no-print" onClick={() => window.print()}>
      <Printer />
      {t("print.button")}
    </Button>
  );
}
