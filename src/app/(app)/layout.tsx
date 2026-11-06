"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { firebaseConfigured } from "@/lib/firebase";
import { useI18n } from "@/lib/i18n";

/** Every page inside (app) needs a signed-in, active user with a role. */
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, logout } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (firebaseConfigured && !loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (!firebaseConfigured) return <Centered>{t("config.missing")}</Centered>;
  if (loading || !user) return <Centered>{t("loading")}</Centered>;
  if (!profile || !profile.active)
    return (
      <Centered>
        <p>{t(profile ? "login.inactive" : "login.noProfile")}</p>
        <button className="btn-outline mt-4" onClick={() => logout()}>
          {t("logout")}
        </button>
      </Centered>
    );

  return <AppShell>{children}</AppShell>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center text-muted">
      <div>{children}</div>
    </div>
  );
}
