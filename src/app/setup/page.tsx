"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import { doc, getDoc, writeBatch } from "firebase/firestore";
import { AuthCard } from "@/components/AuthCard";
import { auth, db, firebaseConfigured } from "@/lib/firebase";
import { useI18n } from "@/lib/i18n";

/** One-time page that creates the first HR account. */
export default function SetupPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [done, setDone] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!firebaseConfigured) return;
    getDoc(doc(db, "meta", "setup"))
      .then((s) => setDone(s.exists()))
      .catch(() => setDone(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const batch = writeBatch(db);
      batch.set(doc(db, "users", cred.user.uid), {
        name: name.trim(),
        email: email.trim(),
        role: "hr",
        active: true,
        createdAt: Date.now(),
      });
      batch.set(doc(db, "meta", "setup"), { by: cred.user.uid, at: Date.now() });
      try {
        await batch.commit();
      } catch (err) {
        await deleteUser(cred.user).catch(() => {});
        throw err;
      }
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title={t("setup.title")}>
      {!firebaseConfigured ? (
        <p className="text-sm text-danger">{t("config.missing")}</p>
      ) : done === null ? (
        <p className="text-sm text-muted">{t("loading")}</p>
      ) : done ? (
        <p className="text-sm text-muted">
          {t("setup.done")}{" "}
          <Link href="/login" className="underline">{t("login.submit")}</Link>
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-muted">{t("setup.intro")}</p>
          <div>
            <label className="label">{t("setup.name")}</label>
            <input required className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">{t("login.email")}</label>
            <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">{t("login.password")}</label>
            <input type="password" minLength={6} required className="input" value={password}
              onChange={(e) => setPassword(e.target.value)} />
            <p className="mt-1 text-xs text-muted">{t("users.passwordHint")}</p>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button className="btn-dark w-full" disabled={busy}>{busy ? t("saving") : t("setup.submit")}</button>
        </form>
      )}
    </AuthCard>
  );
}
