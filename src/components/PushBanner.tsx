"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { enablePush, pushState, refreshPush, type PushState } from "@/lib/push";

/**
 * Asks each user to turn on phone/computer notifications so they are alerted
 * even when the app is closed or they are logged out.
 */
export function PushBanner() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pushState().then(setState);
    if (profile) refreshPush(profile.uid);
  }, [profile]);

  if (!profile || state !== "default") return null;

  return (
    <div className="no-print mb-6 flex flex-wrap items-center gap-3 rounded-2xl bg-forest p-4 text-cream">
      <p className="min-w-0 flex-1 text-sm">🔔 {t("notif.prompt")}</p>
      <button
        className="btn-primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setState(await enablePush(profile.uid).catch(() => pushState()));
          setBusy(false);
        }}
      >
        {t("notif.enable")}
      </button>
    </div>
  );
}
