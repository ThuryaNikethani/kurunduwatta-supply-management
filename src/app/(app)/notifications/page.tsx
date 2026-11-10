"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, CheckCheck, RefreshCw } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { backend, type PushState } from "@/lib/backend";
import { formatDateTime } from "@/lib/format";
import { useNotifications } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { notificationText } from "@/lib/notify";
import { docLink, type AppNotification } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const list = useNotifications(profile?.uid);
  const [push, setPush] = useState<PushState>("unsupported");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    backend.pushState().then(setPush);
  }, []);

  if (!profile) return null;
  const unread = (list ?? []).filter((n) => !n.read);

  function open(n: AppNotification) {
    if (!n.read) backend.markNotificationsRead(profile!.uid, [n.id]);
    router.push(docLink(n.kind, n.docId));
  }

  async function turnOn() {
    setBusy(true);
    try {
      setPush(await backend.enablePush(profile!.uid));
    } catch {
      setPush(await backend.pushState());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t("notif.title")}
        actions={
          unread.length > 0 && (
            <Button variant="outline" onClick={() => backend.markNotificationsRead(profile.uid, unread.map((n) => n.id))}>
              <CheckCheck /> {t("notif.markAll")}
            </Button>
          )
        }
      />

      {push !== "unsupported" && (
        <Card className="py-4">
          <CardContent className="flex flex-wrap items-center gap-3 px-4">
            {push === "granted" ? (
              <>
                <BellRing className="size-5 text-leaf-deep" />
                <p className="flex-1 text-sm text-leaf-deep">{t("notif.enabled")}</p>
                <Button variant="ghost" size="icon" onClick={turnOn} disabled={busy} aria-label={t("notif.refresh")}><RefreshCw /></Button>
              </>
            ) : push === "denied" ? (
              <>
                <BellOff className="size-5 text-destructive" />
                <p className="flex-1 text-sm text-destructive">{t("notif.blocked")}</p>
              </>
            ) : (
              <>
                <Bell className="size-5 text-amber-deep" />
                <p className="flex-1 text-sm">{t("notif.prompt")}</p>
                <Button variant="accent" onClick={turnOn} disabled={busy}>{t("notif.enable")}</Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!list ? (
        <Skeleton className="h-64" />
      ) : list.length === 0 ? (
        <EmptyState icon={Bell} text={t("notif.empty")} />
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <ul className="divide-y">
            {list.map((n) => (
              <li key={n.id}>
                <button onClick={() => open(n)} className={cn("flex w-full gap-3 px-4 py-3.5 text-left transition hover:bg-secondary/50", !n.read && "bg-amber/10")}>
                  <span className={cn("mt-1 flex size-8 shrink-0 items-center justify-center rounded-full", n.read ? "bg-secondary text-muted-foreground" : "bg-amber text-forest")}>
                    <Bell className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm", !n.read && "font-medium")}>{notificationText(n)}</span>
                    {n.note && <span className="mt-0.5 block text-sm text-muted-foreground">“{n.note}”</span>}
                    <span className="mt-0.5 block text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
