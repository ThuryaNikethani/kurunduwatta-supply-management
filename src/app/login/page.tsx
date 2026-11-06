"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { AuthCard } from "@/components/AuthCard";
import { useAuth } from "@/lib/auth";
import { auth, firebaseConfigured } from "@/lib/firebase";
import { useI18n } from "@/lib/i18n";

export default function LoginPage() {
  const { t } = useI18n();
  const { user, profile } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user && profile) router.replace("/dashboard");
  }, [user, profile, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/dashboard");
    } catch {
      setError(t("login.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title={t("login.title")}>
      {!firebaseConfigured && (
        <p className="mb-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">{t("config.missing")}</p>
      )}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">{t("login.email")}</label>
          <input id="email" type="email" autoComplete="email" required className="input"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">{t("login.password")}</label>
          <input id="password" type="password" autoComplete="current-password" required className="input"
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button className="btn-dark w-full" disabled={busy}>
          {busy ? t("loading") : t("login.submit")}
        </button>
      </form>
      <Link href="/setup" className="mt-5 block text-center text-xs text-muted underline">
        {t("setup.link")}
      </Link>
    </AuthCard>
  );
}
