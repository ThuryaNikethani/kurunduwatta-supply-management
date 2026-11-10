"use client";

import { BellRing, Share, Smartphone, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

const SNOOZE_KEY = "kw-ios-hint-snooze";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

/** iPhone/iPad in a Safari tab (not opened from the Home Screen). */
function needsHomeScreen() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

/**
 * On iPhone, popups only work when the site is added to the Home Screen and
 * opened from there. This shows how, step by step, in Sinhala.
 */
export function IosInstallHint() {
  const { t } = useI18n();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let snoozed = false;
    try {
      snoozed = Date.now() - Number(localStorage.getItem(SNOOZE_KEY) || 0) < SNOOZE_MS;
    } catch {}
    setShow(needsHomeScreen() && !snoozed);
  }, []);

  if (!show) return null;

  const steps = [
    { Icon: Share, text: t("ios.step1") },
    { Icon: SquarePlus, text: t("ios.step2") },
    { Icon: Smartphone, text: t("ios.step3") },
    { Icon: BellRing, text: t("ios.step4") },
  ];

  return (
    <div className="no-print relative mb-6 rounded-xl bg-forest p-4 text-cream shadow-sm">
      <button
        type="button"
        aria-label={t("ios.later")}
        className="absolute top-3 right-3 rounded-full p-1 text-cream/70 hover:bg-moss hover:text-cream"
        onClick={() => {
          try {
            localStorage.setItem(SNOOZE_KEY, String(Date.now()));
          } catch {}
          setShow(false);
        }}
      >
        <X className="size-4" />
      </button>
      <p className="pr-8 font-medium text-amber">{t("ios.title")}</p>
      <p className="mt-1 text-sm text-cream/80">{t("ios.why")}</p>
      <ol className="mt-3 grid gap-2">
        {steps.map(({ Icon, text }, n) => (
          <li key={n} className="flex items-center gap-3 text-sm">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-moss text-amber">
              <Icon className="size-4" />
            </span>
            <span>
              <span className="font-semibold text-amber">{n + 1}.</span> {text}
            </span>
          </li>
        ))}
      </ol>
      <Button
        variant="ghost"
        size="sm"
        className="mt-3 text-cream/80 hover:bg-moss hover:text-cream"
        onClick={() => {
          try {
            localStorage.setItem(SNOOZE_KEY, String(Date.now()));
          } catch {}
          setShow(false);
        }}
      >
        {t("ios.later")}
      </Button>
    </div>
  );
}

export { needsHomeScreen };
