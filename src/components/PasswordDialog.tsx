"use client";

import { KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { errorText, useI18n } from "@/lib/i18n";
import { fieldErrors, passwordSchema } from "@/lib/schemas";
import { Field } from "./common";

/** Asks for a new password twice, then calls onSave. */
export function PasswordDialog({
  open, onOpenChange, title, description, onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onSave: (password: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function close(o: boolean) {
    if (!o) {
      setPassword("");
      setConfirm("");
      setErrors({});
    }
    onOpenChange(o);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = passwordSchema.safeParse({ password, confirm });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    try {
      await onSave(parsed.data.password);
      toast.success(t("pw.done"));
      close(false);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-2xl">
              <KeyRound className="size-5" /> {title}
            </DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <Field label={t("pw.new")} htmlFor="pw-new" error={errors.password} hint={t("users.passwordHint")}>
            <Input id="pw-new" type="password" autoComplete="new-password" value={password}
              aria-invalid={!!errors.password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label={t("pw.confirm")} htmlFor="pw-confirm" error={errors.confirm}>
            <Input id="pw-confirm" type="password" autoComplete="new-password" value={confirm}
              aria-invalid={!!errors.confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => close(false)}>{t("cancel")}</Button>
            <Button type="submit" variant="accent" disabled={busy}>{busy ? t("saving") : t("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
