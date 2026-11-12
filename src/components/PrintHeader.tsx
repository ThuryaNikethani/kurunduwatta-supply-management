"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

/** Company letterhead on every printed / PDF copy: both logos, the company name and who printed it. */
export function PrintHeader({ heading }: { heading: string }) {
  const { t } = useI18n();
  const { profile } = useAuth();
  return (
    <div className="print-only mb-6 border-b-2 border-forest pb-3">
      <div className="grid grid-cols-[8rem_1fr_8rem] items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/print-ag.png" alt="Athukorala Group" width={73} height={80} loading="eager" decoding="sync" className="h-20 w-auto justify-self-start" />
        <div className="text-center">
          <p className="text-2xl font-bold tracking-wide text-[#1f6b2e]">{t("print.company")}</p>
          <p className="mt-1 text-lg font-semibold">{heading}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("print.printed")}: {formatDateTime(Date.now())}
            {profile && <> | {t("print.by")}: {profile.name} ({t(`role.${profile.role}`)})</>}
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/print-villa.png" alt="Kurunduwatta Villa" width={107} height={56} loading="eager" decoding="sync" className="h-14 w-auto justify-self-end" />
      </div>
    </div>
  );
}

/** Place to sign and stamp, at the end of every printed / PDF copy. */
export function PrintSignature() {
  const { t } = useI18n();
  const { profile } = useAuth();
  return (
    <div className="print-only mt-10 break-inside-avoid border-t-2 border-forest pt-4">
      {profile && (
        <p className="text-sm">
          {t("print.by")}: <strong>{profile.name}</strong> ({t(`role.${profile.role}`)}) · {formatDateTime(Date.now())}
        </p>
      )}
      <div className="mt-8 grid grid-cols-[1fr_1fr_10rem] items-end gap-8 text-sm">
        <div>
          <div className="h-12 border-b border-dotted border-black" />
          <p className="mt-1">{t("print.signature")}</p>
        </div>
        <div>
          <div className="h-12 border-b border-dotted border-black" />
          <p className="mt-1">{t("print.nameDate")}</p>
        </div>
        <div className="flex h-28 items-center justify-center rounded-lg border-2 border-dashed border-black/50 text-center text-muted-foreground">
          {t("print.seal")}
        </div>
      </div>
    </div>
  );
}

/** Wait until every picture (the logos) has fully loaded, then print. */
async function printWhenReady() {
  await Promise.all(
    [...document.images].map((img) => (img.complete ? img.decode() : new Promise((r) => { img.onload = img.onerror = r; })).catch(() => {})),
  );
  window.print();
}

export function PrintButton() {
  const { t } = useI18n();
  return (
    <Button variant="outline" className="no-print" onClick={printWhenReady}>
      <Printer />
      {t("print.button")}
    </Button>
  );
}
