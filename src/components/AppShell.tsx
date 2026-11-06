"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { useI18n, type TKey } from "@/lib/i18n";
import { notificationText } from "@/lib/notify";
import { silenceForegroundPush } from "@/lib/push";
import { docLink, type AppNotification, type Role } from "@/lib/types";
import { PushBanner } from "./PushBanner";
import { useToast } from "./Toast";

const NAV: { href: string; key: TKey; roles: Role[] }[] = [
  { href: "/dashboard", key: "nav.dashboard", roles: ["chef", "supervisor", "hr"] },
  { href: "/requests/new", key: "nav.newList", roles: ["chef"] },
  { href: "/recipes", key: "nav.recipes", roles: ["chef", "supervisor", "hr"] },
  { href: "/users", key: "nav.users", roles: ["hr"] },
];

export function LangToggle({ className = "" }: { className?: string }) {
  const { t, toggle } = useI18n();
  return (
    <button onClick={toggle} className={`rounded-full border px-3 py-1 text-xs ${className}`}>
      {t("language")}
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, logout } = useAuth();
  const { t, lang } = useI18n();
  const toast = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const mountedAt = useRef(Date.now());
  const seen = useRef(new Set<string>());

  // Live notifications: badge count + toast + system notification for new ones.
  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, "users", profile.uid, "notifications"),
      orderBy("createdAt", "desc"),
      limit(50),
    );
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification);
      setUnread(list.filter((n) => !n.read).length);
      for (const n of list) {
        if (seen.current.has(n.id)) continue;
        seen.current.add(n.id);
        if (n.createdAt < mountedAt.current || n.read) continue;
        const text = notificationText(n)[lang];
        const href = docLink(n.kind, n.docId);
        toast({ text, sub: n.note || undefined, href });
        if (document.hidden && "Notification" in window && Notification.permission === "granted") {
          try {
            new Notification(text, { body: n.note, icon: "/icons/192" }).onclick = () => {
              window.focus();
              router.push(href);
            };
          } catch {}
        }
      }
    });
  }, [profile, lang, toast, router]);

  useEffect(() => {
    let off: (() => void) | undefined;
    silenceForegroundPush().then((f) => (off = f));
    return () => off?.();
  }, []);

  if (!profile) return null;
  const nav = NAV.filter((n) => n.roles.includes(profile.role));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-forest text-cream shadow">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/dashboard" className="min-w-0 flex-1">
            <p className="truncate font-display text-xl leading-tight font-semibold sm:text-2xl">
              {t("appName")}
            </p>
            <p className="truncate text-[11px] text-cream/60">
              {profile.name} · {t(`role.${profile.role}`)}
            </p>
          </Link>
          <LangToggle className="border-cream/30 text-cream hover:bg-moss" />
          <Link
            href="/notifications"
            aria-label={t("nav.notifications")}
            className="relative rounded-full p-2 hover:bg-moss"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber px-1 text-[11px] font-semibold text-forest">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <button
            onClick={() => logout().then(() => router.replace("/login"))}
            className="hidden rounded-full px-3 py-1 text-xs text-cream/80 hover:bg-moss sm:block"
          >
            {t("logout")}
          </button>
        </div>
        <nav className="border-t border-cream/10 bg-moss">
          <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2">
            {nav.map((n) => {
              const active = pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href));
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`border-b-2 px-3 py-2.5 text-sm whitespace-nowrap ${
                    active ? "border-amber text-amber" : "border-transparent text-cream/80 hover:text-cream"
                  }`}
                >
                  {t(n.key)}
                </Link>
              );
            })}
            <button
              onClick={() => logout().then(() => router.replace("/login"))}
              className="ml-auto px-3 py-2.5 text-sm whitespace-nowrap text-cream/80 sm:hidden"
            >
              {t("logout")}
            </button>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24">
        <PushBanner />
        {children}
      </main>
    </div>
  );
}
