"use client";

import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { HistoryEntry } from "@/lib/types";

const DOT: Record<string, string> = {
  return_to_chef: "bg-danger",
  reject_to_supervisor: "bg-danger",
  approve: "bg-leaf-deep",
};

export function Timeline({ history }: { history: HistoryEntry[] }) {
  const { t, lang } = useI18n();
  const items = [...history].sort((a, b) => a.at - b.at);
  return (
    <div className="card">
      <h2 className="h2 mb-4">{t("detail.history")}</h2>
      <ol className="relative space-y-5 border-l border-mist pl-5">
        {items.map((h, i) => (
          <li key={i} className="relative">
            <span className={`absolute top-1.5 -left-[25px] h-2.5 w-2.5 rounded-full ${DOT[h.action] ?? "bg-amber"}`} />
            <p className="text-sm">
              <span className="font-medium">{h.name}</span>{" "}
              <span className="text-muted">({t(`role.${h.role}`)})</span> {t(`did.${h.action}`)}
            </p>
            <p className="text-xs text-muted">{formatDateTime(h.at, lang)}</p>
            {h.note && (
              <p className="mt-1.5 rounded-lg bg-cream px-3 py-2 text-sm whitespace-pre-wrap">“{h.note}”</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
