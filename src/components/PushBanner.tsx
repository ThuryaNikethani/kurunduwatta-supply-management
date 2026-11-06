"use client";

import { BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { backend, type PushState } from "@/lib/backend";
import { useI18n } from "@/lib/i18n";

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
    backend.pushState().then(setState);
    if (profile) backend.refreshPush(profile.uid);
  }, [profile]);

  if (!profile || state !== "default") return null;

  return (
    <div className="no-print mb-6 flex flex-wrap items-center gap-3 rounded-xl bg-forest p-4 text-cream shadow-sm">
      <BellRing className="size-5 shrink-0 text-amber" />
      <p className="min-w-0 flex-1 text-sm">{t("notif.prompt")}</p>
      <Button
        variant="accent"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setState(await backend.enablePush(profile.uid).catch(() => backend.pushState()));
          setBusy(false);
        }}
      >
        {t("notif.enable")}
      </Button>
    </div>
  );
}
