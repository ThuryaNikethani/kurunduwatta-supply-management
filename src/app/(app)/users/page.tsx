"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Languages, UserPlus } from "lucide-react";
import { EmptyState, Field, PageHeader, initials } from "@/components/common";
import { BackupsCard } from "@/components/BackupsCard";
import { PasswordDialog } from "@/components/PasswordDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { backend } from "@/lib/backend";
import { useUsers } from "@/lib/hooks";
import { errorText, useI18n } from "@/lib/i18n";
import { fieldErrors, newUserSchema, usernameSi } from "@/lib/schemas";
import { ROLES, type Role, type UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function UsersPage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const users = useUsers();
  const [form, setForm] = useState({ name: "", username: "", usernameSi: "", password: "", role: "chef" as Role });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [pwFor, setPwFor] = useState<UserProfile | null>(null);
  /** Whose Sinhala login name is being set. */
  const [siFor, setSiFor] = useState<UserProfile | null>(null);

  if (profile?.role !== "hr") return <EmptyState text={t("detail.notFound")} />;

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    const parsed = newUserSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    try {
      await backend.createUser({ ...parsed.data, role: form.role });
      setForm({ name: "", username: "", usernameSi: "", password: "", role: form.role });
      toast.success(t("users.created"));
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const RoleSelect = ({ value, onChange, disabled }: { value: Role; onChange: (r: Role) => void; disabled?: boolean }) => (
    <Select value={value} onValueChange={(v) => onChange(v as Role)} disabled={disabled}>
      <SelectTrigger className="w-full min-w-32"><SelectValue /></SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => <SelectItem key={r} value={r}>{t(`role.${r}`)}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  return (
    <div className="grid gap-6 [&>*]:min-w-0">
      <PageHeader title={t("users.title")} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-2xl"><UserPlus className="size-5" /> {t("users.add")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addUser} className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3" noValidate>
            <Field label={t("users.name")} htmlFor="u-name" error={errors.name}>
              <Input id="u-name" value={form.name} aria-invalid={!!errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label={t("login.username")} htmlFor="u-username" error={errors.username} hint={t("users.usernameHint")}>
              <Input id="u-username" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={form.username}
                aria-invalid={!!errors.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </Field>
            <Field label={t("users.usernameSi")} htmlFor="u-username-si" error={errors.usernameSi} hint={t("users.usernameSiHint")}>
              <Input id="u-username-si" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={form.usernameSi}
                aria-invalid={!!errors.usernameSi} onChange={(e) => setForm({ ...form, usernameSi: e.target.value })} />
            </Field>
            <Field label={t("login.password")} htmlFor="u-pw" error={errors.password} hint={t("users.passwordHint")}>
              <Input id="u-pw" value={form.password} aria-invalid={!!errors.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <Field label={t("users.role")}>
              <RoleSelect value={form.role} onChange={(role) => setForm({ ...form, role })} />
            </Field>
            <Button type="submit" variant="accent" className="lg:mt-[22px]" disabled={busy}>
              <UserPlus /> {busy ? t("saving") : t("users.add")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="py-2">
        <CardContent className="px-2 sm:px-4">
          {!users ? (
            <Skeleton className="m-2 h-40" />
          ) : (
            <>
            {/* phones: one block per person */}
            <ul className="divide-y sm:hidden">
              {users.map((u) => (
                <li key={u.uid} className="grid gap-3 px-2 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-secondary text-xs font-semibold text-moss">{initials(u.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{u.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{t("users.loginAs", { name: u.username })}</p>
                      {u.usernameSi && <p className="truncate text-sm text-muted-foreground">{t("users.loginAsSi", { name: u.usernameSi })}</p>}
                    </div>
                  </div>
                  <RoleSelect value={u.role} disabled={u.uid === profile.uid}
                    onChange={(role) => backend.updateUser(u.uid, { role })} />
                  <Button variant="outline" onClick={() => setSiFor(u)}>
                    <Languages /> {t("users.setSi")}
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => setPwFor(u)}>
                      <KeyRound /> {t("pw.button")}
                    </Button>
                    <Button variant="secondary" disabled={u.uid === profile.uid}
                      onClick={() => backend.updateUser(u.uid, { active: !u.active })}
                      className={cn("rounded-full", u.active ? "bg-leaf/30 text-leaf-deep hover:bg-leaf/40" : "bg-destructive/10 text-destructive hover:bg-destructive/15")}>
                      {u.active ? t("users.active") : t("users.disabled")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("users.name")}</TableHead>
                  <TableHead>{t("users.role")}</TableHead>
                  <TableHead className="text-right">{t("users.active")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.uid}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-secondary text-xs font-semibold text-moss">{initials(u.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{u.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{t("users.loginAs", { name: u.username })}</p>
                          {u.usernameSi && <p className="truncate text-xs text-muted-foreground">{t("users.loginAsSi", { name: u.usernameSi })}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="w-40">
                      <RoleSelect value={u.role} disabled={u.uid === profile.uid}
                        onChange={(role) => backend.updateUser(u.uid, { role })} />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="sm" variant="outline" className="mr-2" onClick={() => setSiFor(u)}>
                        <Languages /> {t("users.setSi")}
                      </Button>
                      <Button size="sm" variant="outline" className="mr-2" onClick={() => setPwFor(u)}>
                        <KeyRound /> {t("pw.button")}
                      </Button>
                      <Button size="sm" variant="secondary" disabled={u.uid === profile.uid}
                        onClick={() => backend.updateUser(u.uid, { active: !u.active })}
                        className={cn("rounded-full", u.active ? "bg-leaf/30 text-leaf-deep hover:bg-leaf/40" : "bg-destructive/10 text-destructive hover:bg-destructive/15")}>
                        {u.active ? t("users.active") : t("users.disabled")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <BackupsCard />

      <SinhalaNameDialog user={siFor} onClose={() => setSiFor(null)} />

      <PasswordDialog
        open={!!pwFor}
        onOpenChange={(o) => !o && setPwFor(null)}
        title={t("pw.resetFor", { name: pwFor?.name ?? "" })}
        description={t("pw.resetHint", { name: pwFor?.name ?? "" })}
        onSave={(pw) =>
          pwFor?.uid === profile.uid ? backend.changeOwnPassword(pw) : backend.resetPassword(pwFor!.uid, pw)
        }
      />
    </div>
  );
}

/** HR sets or clears someone's Sinhala login name. */
function SinhalaNameDialog({ user, onClose }: { user: UserProfile | null; onClose: () => void }) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [forUid, setForUid] = useState<string | null>(null);
  // Start from the current name each time the box opens for someone.
  if (user && user.uid !== forUid) {
    setForUid(user.uid);
    setValue(user.usernameSi ?? "");
    setError("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = usernameSi.safeParse(value.trim());
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "v.username");
    setBusy(true);
    try {
      await backend.setSinhalaName(user.uid, value.trim());
      toast.success(t("users.siSaved"));
      setForUid(null);
      onClose();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={(o) => { if (!o) { setForUid(null); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={save} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{t("users.setSiFor", { name: user?.name ?? "" })}</DialogTitle>
            <p className="text-sm text-muted-foreground">{t("users.setSiHelp", { name: user?.username ?? "" })}</p>
          </DialogHeader>
          <Field label={t("users.usernameSi")} htmlFor="si-name" error={error}>
            <Input id="si-name" autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} value={value}
              placeholder={t("users.usernameSiPh")} aria-invalid={!!error} onChange={(e) => { setValue(e.target.value); setError(""); }} />
          </Field>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => { setForUid(null); onClose(); }}>{t("cancel")}</Button>
            <Button type="submit" variant="accent" disabled={busy}>{busy ? t("saving") : t("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
