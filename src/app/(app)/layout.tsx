"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, UserX } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

/** Every page inside (app) needs a signed-in, active user with a role. */
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { status, profile, logout } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (status === "signedOut") router.replace("/login");
  }, [status, router]);

  if (status === "loading" || status === "signedOut")
    return (
      <Centered>
        <Loader2 className="size-6 animate-spin text-moss" />
      </Centered>
    );

  if (status === "noProfile" || !profile?.active)
    return (
      <Centered>
        <UserX className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 max-w-xs text-sm text-muted-foreground">
          {t(status === "noProfile" ? "login.noProfile" : "login.inactive")}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => logout()}>
          {t("logout")}
        </Button>
      </Centered>
    );

  return <AppShell>{children}</AppShell>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>{children}</div>
    </div>
  );
}
