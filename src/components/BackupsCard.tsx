"use client";

import { Archive, Download, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isDemo } from "@/lib/backend";
import { formatDateTime } from "@/lib/format";
import { errorText, useI18n } from "@/lib/i18n";
import { accessToken } from "@/lib/supabase";

interface Backup {
  name: string;
  size: number;
  createdAt: string;
}

async function call(method: "GET" | "POST", query = "") {
  const res = await fetch(`/api/backups${query}`, { method, headers: { Authorization: `Bearer ${await accessToken()}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? "failed"), { code: data.code });
  return data;
}

/** HR: weekly automatic backups, plus take one now and download. */
export function BackupsCard() {
  const { t } = useI18n();
  const [list, setList] = useState<Backup[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setList((await call("GET")).backups);
    } catch (e) {
      setList([]);
      toast.error(errorText(e));
    }
  }, []);

  useEffect(() => {
    if (!isDemo) load();
  }, [load]);

  if (isDemo) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-2xl">
          <Archive className="size-5" /> {t("backup.title")}
        </CardTitle>
        <CardDescription>{t("backup.intro")}</CardDescription>
        <CardAction>
          <Button variant="outline" disabled={busy} onClick={async () => {
            setBusy(true);
            try {
              await call("POST");
              toast.success(t("backup.done"));
              await load();
            } catch (e) {
              toast.error(errorText(e));
            } finally {
              setBusy(false);
            }
          }}>
            {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />} {t("backup.now")}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="rounded-lg bg-amber/10 px-3 py-2 text-sm text-amber-deep">{t("backup.hint")}</p>
        {!list ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("backup.empty")}</p>
        ) : (
          <ul className="divide-y">
            {list.map((b) => (
              <li key={b.name} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>
                  {formatDateTime(new Date(b.createdAt).getTime())}
                  <span className="ml-2 text-xs text-muted-foreground">{Math.max(1, Math.round(b.size / 1024))} KB</span>
                </span>
                <Button variant="ghost" size="sm" onClick={async () => {
                  try {
                    const { url } = await call("GET", `?download=${encodeURIComponent(b.name)}`);
                    window.location.href = url;
                  } catch (e) {
                    toast.error(errorText(e));
                  }
                }}>
                  <Download /> {t("backup.download")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
