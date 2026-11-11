"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChefHat, LogIn, ShieldCheck, UserCheck } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { Field } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { backend, isDemo } from "@/lib/backend";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/backend/demo";
import { useI18n } from "@/lib/i18n";
import { fieldErrors, loginSchema } from "@/lib/schemas";

const ROLE_ICON = { chef: ChefHat, supervisor: UserCheck, hr: ShieldCheck };

export default function LoginPage() {
  const { t } = useI18n();
  const { status } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "ready") router.replace("/dashboard");
  }, [status, router]);

  async function signIn(u: string, p: string) {
    const parsed = loginSchema.safeParse({ username: u, password: p });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setBusy(true);
    setErrors({});
    try {
      await backend.signIn(parsed.data.username, parsed.data.password);
      router.replace("/dashboard");
    } catch {
      setErrors({ form: "login.failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title={t("login.title")}>
      <form onSubmit={(e) => { e.preventDefault(); signIn(username, password); }} className="grid gap-4" noValidate>
        <Field label={t("login.username")} htmlFor="username" error={errors.username}>
          <Input id="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
            value={username} aria-invalid={!!errors.username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
        <Field label={t("login.password")} htmlFor="password" error={errors.password}>
          <Input id="password" type="password" autoComplete="current-password" value={password}
            aria-invalid={!!errors.password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {errors.form && <p className="text-sm text-destructive">{t("login.failed")}</p>}
        <Button type="submit" size="lg" disabled={busy}>
          <LogIn /> {busy ? t("loading") : t("login.submit")}
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-muted-foreground">{t("login.forgot")}</p>

      {isDemo ? (
        <div className="mt-6 grid gap-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Separator className="flex-1" />
            {t("demo.accounts")}
            <Separator className="flex-1" />
          </div>
          {DEMO_ACCOUNTS.map((a) => {
            const Icon = ROLE_ICON[a.role];
            return (
              <Button key={a.username} variant="outline" className="h-auto justify-start py-2.5" disabled={busy}
                onClick={() => signIn(a.username, DEMO_PASSWORD)}>
                <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-moss"><Icon /></span>
                <span className="text-left">
                  <span className="block text-sm">{t(`role.${a.role}`)}</span>
                  <span className="block text-xs font-normal text-muted-foreground">{a.username}</span>
                </span>
              </Button>
            );
          })}
          <p className="text-center text-xs text-muted-foreground">{t("demo.password", { pw: DEMO_PASSWORD })}</p>
        </div>
      ) : (
        <Link href="/setup" className="mt-5 block text-center text-xs text-muted-foreground underline">
          {t("setup.link")}
        </Link>
      )}
    </AuthLayout>
  );
}
