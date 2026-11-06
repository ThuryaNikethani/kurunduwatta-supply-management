"use client";

import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

/** Villa letterhead shown only on the printed / PDF copy. */
export function PrintHeader({ heading }: { heading: string }) {
  const { t, lang } = useI18n();
  return (
    <div className="print-only mb-6 border-b-2 border-forest pb-3">
      <p className="font-display text-3xl font-semibold">Kurunduwatta Villa</p>
      <div className="flex justify-between text-sm text-muted">
        <span>{heading}</span>
        <span>
          {t("print.printed")}: {formatDateTime(Date.now(), lang)}
        </span>
      </div>
    </div>
  );
}

export function PrintButton() {
  const { t } = useI18n();
  return (
    <button className="btn-outline no-print" onClick={() => window.print()}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 14h12v8H6z" />
      </svg>
      {t("print.button")}
    </button>
  );
}
