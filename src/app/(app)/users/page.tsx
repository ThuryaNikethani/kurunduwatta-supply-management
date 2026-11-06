"use client";

import { useEffect, useState } from "react";
import { deleteApp, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, signOut } from "firebase/auth";
import { collection, doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { db, firebaseConfig } from "@/lib/firebase";
import { useI18n } from "@/lib/i18n";
import { ROLES, type Role, type UserProfile } from "@/lib/types";

export default function UsersPage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "chef" as Role });
  const [busy, setBusy] = useState(false);

  useEffect(
    () =>
      onSnapshot(collection(db, "users"), (s) =>
        setUsers(
          s.docs
            .map((d) => ({ uid: d.id, ...d.data() }) as UserProfile)
            .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name)),
        ),
      ),
    [],
  );

  if (profile?.role !== "hr") return <p className="text-muted">{t("detail.notFound")}</p>;

  // A second Firebase app creates the account so HR stays signed in.
  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const secondary = initializeApp(firebaseConfig, `create-${Date.now()}`);
    try {
      const secAuth = getAuth(secondary);
      const cred = await createUserWithEmailAndPassword(secAuth, form.email.trim(), form.password);
      await signOut(secAuth);
      await setDoc(doc(db, "users", cred.user.uid), {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        active: true,
        createdAt: Date.now(),
      });
      setForm({ name: "", email: "", password: "", role: form.role });
      toast({ text: t("users.created"), tone: "success" });
    } catch (err) {
      toast({ text: err instanceof Error ? err.message : t("error"), tone: "error" });
    } finally {
      await deleteApp(secondary).catch(() => {});
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="h1">{t("users.title")}</h1>

      <form onSubmit={addUser} className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <div>
          <label className="label">{t("users.name")}</label>
          <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">{t("login.email")}</label>
          <input type="email" className="input" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label">{t("login.password")}</label>
          <input type="text" minLength={6} className="input" required placeholder={t("users.passwordHint")}
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div>
          <label className="label">{t("users.role")}</label>
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            {ROLES.map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
          </select>
        </div>
        <button className="btn-primary" disabled={busy}>{busy ? t("saving") : `+ ${t("users.add")}`}</button>
      </form>

      {!users ? (
        <p className="text-muted">{t("loading")}</p>
      ) : (
        <div className="card divide-y divide-mist p-0 sm:p-0">
          {users.map((u) => (
            <div key={u.uid} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{u.name}</p>
                <p className="truncate text-xs text-muted">{u.email}</p>
              </div>
              <select className="input w-auto" value={u.role} disabled={u.uid === profile.uid}
                onChange={(e) => updateDoc(doc(db, "users", u.uid), { role: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
              </select>
              <button disabled={u.uid === profile.uid}
                onClick={() => updateDoc(doc(db, "users", u.uid), { active: !u.active })}
                className={`rounded-full px-3 py-1 text-xs ${u.active ? "bg-leaf/30 text-leaf-deep" : "bg-danger/10 text-danger"}`}>
                {u.active ? t("users.active") : t("users.disabled")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
