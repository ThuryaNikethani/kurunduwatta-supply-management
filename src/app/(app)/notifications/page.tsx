"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc, writeBatch } from "firebase/firestore";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { notificationText } from "@/lib/notify";
import { enablePush, pushState, type PushState } from "@/lib/push";
import { docLink, type AppNotification } from "@/lib/types";

export default function NotificationsPage() {
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const router = useRouter();
  const [list, setList] = useState<AppNotification[] | null>(null);
  const [push, setPush] = useState<PushState>("unsupported");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, "users", profile.uid, "notifications"), orderBy("createdAt", "desc"), limit(100));
    return onSnapshot(q, (s) => setList(s.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification)));
  }, [profile]);

  useEffect(() => {
    pushState().then(setPush);
  }, []);

  if (!profile) return null;

  async function markAll() {
    const batch = writeBatch(db);
    for (const n of list ?? [])
      if (!n.read) batch.update(doc(db, "users", profile!.uid, "notifications", n.id), { read: true });
    await batch.commit();
  }

  async function open(n: AppNotification) {
    if (!n.read) updateDoc(doc(db, "users", profile!.uid, "notifications", n.id), { read: true });
    router.push(docLink(n.kind, n.docId));
  }

  async function turnOn() {
    setBusy(true);
    try {
      setPush(await enablePush(profile!.uid));
    } catch {
      setPush(await pushState());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="h1">{t("notif.title")}</h1>
        <button className="btn-outline" onClick={markAll}>{t("notif.markAll")}</button>
      </div>

      {push !== "unsupported" && (
        <div className="card flex flex-wrap items-center justify-between gap-3 py-3 sm:py-4">
          {push === "granted" ? (
            <p className="text-sm text-leaf-deep">✓ {t("notif.enabled")}</p>
          ) : push === "denied" ? (
            <p className="text-sm text-danger">{t("notif.blocked")}</p>
          ) : (
            <button className="btn-primary" onClick={turnOn} disabled={busy}>🔔 {t("notif.enable")}</button>
          )}
          {push === "granted" && (
            <button className="text-xs text-muted underline" onClick={turnOn} disabled={busy}>↻</button>
          )}
        </div>
      )}

      {!list ? (
        <p className="text-muted">{t("loading")}</p>
      ) : list.length === 0 ? (
        <p className="card text-sm text-muted">{t("notif.empty")}</p>
      ) : (
        <ul className="card divide-y divide-mist p-0 sm:p-0">
          {list.map((n) => (
            <li key={n.id}>
              <button onClick={() => open(n)}
                className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-cream ${n.read ? "" : "bg-amber/10"}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-amber"}`} />
                <span className="min-w-0">
                  <span className="block text-sm">{notificationText(n)[lang]}</span>
                  {n.note && <span className="mt-0.5 block text-sm text-muted">“{n.note}”</span>}
                  <span className="mt-0.5 block text-xs text-muted">{formatDateTime(n.createdAt, lang)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
