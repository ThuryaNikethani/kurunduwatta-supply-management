"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { Field } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { backend } from "@/lib/backend";
import { useI18n } from "@/lib/i18n";
import { fieldErrors, newUserSchema } from "@/lib/schemas";

/** One-time page that creates the first HR account. */
export default function SetupPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [done, setDone] = useState<boolean | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    backend.isSetupDone().then(setDone).catch(() => setDone(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = newUserSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    setFormError("");
    try {
      await backend.setupFirstHr(parsed.data);
      router.replace("/dashboard");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title={t("setup.title")}>
      {done === null ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : done ? (
        <p className="text-sm text-muted-foreground">
          {t("setup.done")}{" "}
          <Link href="/login" className="font-medium text-forest underline">{t("login.submit")}</Link>
        </p>
      ) : (
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <p className="text-sm text-muted-foreground">{t("setup.intro")}</p>
          <Field label={t("setup.name")} htmlFor="name" error={errors.name}>
            <Input id="name" value={form.name} aria-invalid={!!errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label={t("login.email")} htmlFor="email" error={errors.email}>
            <Input id="email" type="email" value={form.email} aria-invalid={!!errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label={t("login.password")} htmlFor="pw" error={errors.password} hint={t("users.passwordHint")}>
            <Input id="pw" type="password" value={form.password} aria-invalid={!!errors.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button type="submit" size="lg" disabled={busy}>
            <ShieldCheck /> {busy ? t("saving") : t("setup.submit")}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
