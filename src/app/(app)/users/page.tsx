"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, UserPlus } from "lucide-react";
import { EmptyState, Field, PageHeader, initials } from "@/components/common";
import { BackupsCard } from "@/components/BackupsCard";
import { PasswordDialog } from "@/components/PasswordDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { backend } from "@/lib/backend";
import { useUsers } from "@/lib/hooks";
import { errorText, useI18n } from "@/lib/i18n";
import { fieldErrors, newUserSchema } from "@/lib/schemas";
import { ROLES, type Role, type UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function UsersPage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const users = useUsers();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "chef" as Role });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [pwFor, setPwFor] = useState<UserProfile | null>(null);

  if (profile?.role !== "hr") return <EmptyState text={t("detail.notFound")} />;

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    const parsed = newUserSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    try {
      await backend.createUser({ ...parsed.data, role: form.role });
      setForm({ name: "", email: "", password: "", role: form.role });
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
    <div className="grid gap-6">
      <PageHeader title={t("users.title")} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-2xl"><UserPlus className="size-5" /> {t("users.add")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addUser} className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-5" noValidate>
            <Field label={t("users.name")} htmlFor="u-name" error={errors.name}>
              <Input id="u-name" value={form.name} aria-invalid={!!errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label={t("login.email")} htmlFor="u-email" error={errors.email}>
              <Input id="u-email" type="email" value={form.email} aria-invalid={!!errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
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
                          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="w-40">
                      <RoleSelect value={u.role} disabled={u.uid === profile.uid}
                        onChange={(role) => backend.updateUser(u.uid, { role })} />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
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
          )}
        </CardContent>
      </Card>

      <BackupsCard />

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
