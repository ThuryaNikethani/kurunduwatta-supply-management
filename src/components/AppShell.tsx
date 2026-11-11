"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Bell,
  BookOpen,
  ChefHat,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PlusCircle,
  KeyRound,
  RotateCcw,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { backend, isDemo } from "@/lib/backend";
import { resetDemo } from "@/lib/backend/demo";
import { useNotifications } from "@/lib/hooks";
import { useI18n, type TKey } from "@/lib/i18n";
import { notificationText } from "@/lib/notify";
import { docLink, type Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import { initials } from "./common";
import { IosInstallHint } from "./IosInstallHint";
import { PasswordDialog } from "./PasswordDialog";
import { PushBanner } from "./PushBanner";

const NAV: { href: string; key: TKey; roles: Role[]; Icon: LucideIcon }[] = [
  { href: "/dashboard", key: "nav.dashboard", roles: ["chef", "supervisor", "hr"], Icon: LayoutDashboard },
  { href: "/requests/new", key: "nav.newList", roles: ["chef"], Icon: PlusCircle },
  { href: "/recipes", key: "nav.recipes", roles: ["chef", "supervisor", "hr"], Icon: BookOpen },
  { href: "/stock", key: "nav.stock", roles: ["chef", "supervisor", "hr"], Icon: Package },
  { href: "/orders", key: "nav.orders", roles: ["supervisor", "hr"], Icon: ShoppingCart },
  { href: "/reports", key: "nav.reports", roles: ["chef", "supervisor", "hr"], Icon: BarChart3 },
  { href: "/notifications", key: "nav.notifications", roles: ["chef", "supervisor", "hr"], Icon: Bell },
  { href: "/users", key: "nav.users", roles: ["hr"], Icon: Users },
];

function Brand() {
  const { t } = useI18n();
  return (
    <Link href="/dashboard" className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber text-forest">
        <ChefHat className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-xl leading-tight font-semibold">{t("appName")}</span>
        <span className="block truncate text-[11px] text-sidebar-foreground/60">{t("appTagline")}</span>
      </span>
    </Link>
  );
}

function NavLinks({ unread, onNavigate }: { unread: number; onNavigate?: () => void }) {
  const { profile } = useAuth();
  const { t } = useI18n();
  const pathname = usePathname();
  if (!profile) return null;
  return (
    <nav className="grid gap-1">
      {NAV.filter((n) => n.roles.includes(profile.role)).map(({ href, key, Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-primary"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="size-4" />
            <span className="flex-1">{t(key)}</span>
            {href === "/notifications" && unread > 0 && (
              <span className="rounded-full bg-amber px-1.5 text-[11px] font-semibold text-forest">{unread}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function UserMenu({ light, compact }: { light?: boolean; compact?: boolean }) {
  const { profile, logout } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [pwOpen, setPwOpen] = useState(false);
  if (!profile) return null;
  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-3 rounded-lg p-2 text-left transition",
            compact ? "shrink-0 rounded-full p-1" : "w-full",
            light ? "hover:bg-sidebar-accent" : "hover:bg-secondary",
          )}
        >
          <Avatar className="size-9">
            <AvatarFallback className="bg-amber font-semibold text-forest">{initials(profile.name)}</AvatarFallback>
          </Avatar>
          <span className={cn("min-w-0 flex-1", compact ? "hidden" : "hidden sm:block")}>
            <span className="block truncate text-sm font-medium">{profile.name}</span>
            <span className={cn("block truncate text-xs", light ? "text-sidebar-foreground/60" : "text-muted-foreground")}>
              {t(`role.${profile.role}`)}
            </span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="truncate">{profile.name}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{profile.username}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setPwOpen(true)}>
          <KeyRound /> {t("pw.mine")}
        </DropdownMenuItem>
        {isDemo && (
          <DropdownMenuItem
            onSelect={() => {
              if (confirm(t("demo.resetConfirm"))) resetDemo();
            }}
          >
            <RotateCcw /> {t("demo.reset")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => logout().then(() => router.replace("/login"))}>
          <LogOut /> {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <PasswordDialog open={pwOpen} onOpenChange={setPwOpen} title={t("pw.mine")} onSave={(pw) => backend.changeOwnPassword(pw)} />
    </>
  );
}

/** Watches notifications: unread badge + toast + system notification. */
function useLiveNotifications() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const list = useNotifications(profile?.uid);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!list) return;
    if (!seen.current) {
      seen.current = new Set(list.map((n) => n.id)); // don't toast old ones
      return;
    }
    for (const n of list) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      if (n.read) continue;
      const text = notificationText(n);
      const href = docLink(n.kind, n.docId);
      toast(text, {
        description: n.note || undefined,
        icon: <Bell className="size-4 text-amber-deep" />,
        action: { label: t("notif.open"), onClick: () => router.push(href) },
        duration: 8000,
      });
      if (document.hidden && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(text, { body: n.note, icon: "/icons/192", tag: n.id }).onclick = () => {
            window.focus();
            router.push(href);
          };
        } catch {}
      }
    }
  }, [list, router, t]);

  return (list ?? []).filter((n) => !n.read).length;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const { t } = useI18n();
  const unread = useLiveNotifications();
  const [open, setOpen] = useState(false);
  if (!profile) return null;

  return (
    <div className="min-h-screen lg:flex">
      {/* desktop sidebar */}
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 bg-sidebar p-4 text-sidebar-foreground lg:flex">
        <Brand />
        <NavLinks unread={unread} />
        <div className="mt-auto grid gap-2">
          <UserMenu light />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* mobile top bar */}
        <header className="no-print sticky top-0 z-40 flex items-center gap-2 bg-sidebar px-3 py-2.5 text-sidebar-foreground shadow lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-sidebar-accent hover:text-sidebar-foreground" aria-label={t("nav.menu")}>
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-none bg-sidebar p-4 text-sidebar-foreground">
              <SheetHeader className="p-0">
                <SheetTitle className="sr-only">{t("appName")}</SheetTitle>
                <Brand />
              </SheetHeader>
              <NavLinks unread={unread} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="min-w-0 flex-1 truncate font-display text-xl font-semibold">{t("appName")}</div>
          <Link href="/notifications" className="relative rounded-full p-2 hover:bg-sidebar-accent" aria-label={t("nav.notifications")}>
            <Bell className="size-5" />
            {unread > 0 && (
              <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber px-1 text-[10px] font-semibold text-forest">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <UserMenu light compact />
        </header>

        {isDemo && (
          <div className="no-print flex items-center gap-2 bg-amber/20 px-4 py-2 text-xs text-amber-deep">
            <FlaskConical className="size-4 shrink-0" />
            <span>{t("demo.banner")}</span>
          </div>
        )}

        <main className="print-main mx-auto w-full max-w-6xl px-4 py-6 pb-24 sm:px-6 lg:py-8">
          <IosInstallHint />
          <PushBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
