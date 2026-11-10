"use client";

import { Plus, Send, Trash2, UserPlus, Users, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { today } from "@/lib/format";
import { errorText, useI18n, type TKey } from "@/lib/i18n";
import { fieldErrors, transferSchema } from "@/lib/schemas";
import type { LeftoverItem, TransferOut } from "@/lib/types";
import { Field, StepTitle } from "./common";
import { DraftNotice } from "./DraftNotice";
import { useDraft } from "@/lib/draft";

export type TransferFormData = Pick<TransferOut, "date" | "items" | "recipients">;

export function TransferForm({
  dishOptions, guestCount, initial, submitLabel, onSubmit, onCancel, draftKey,
}: {
  dishOptions: string[];
  guestCount: number;
  initial?: TransferFormData;
  submitLabel: string;
  onSubmit: (data: TransferFormData, note: string) => Promise<void>;
  onCancel?: () => void;
  /** Where unsent input is kept so a refresh doesn't lose it. */
  draftKey: string;
}) {
  const { t } = useI18n();
  const [date, setDate] = useState(initial?.date ?? today());
  const [items, setItems] = useState<LeftoverItem[]>(initial?.items ?? [{ dish: dishOptions[0] ?? "", portions: 1, note: "" }]);
  const [recipients, setRecipients] = useState<string[]>(initial?.recipients ?? []);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  type Draft = TransferFormData & { name: string; note: string };
  const [start] = useState<Draft>(() => ({ date, items, recipients, name: "", note: "" }));
  const draft = useDraft<Draft>(
    draftKey,
    { date, items, recipients, name, note },
    (d) => {
      setDate(d.date);
      setItems(d.items);
      setRecipients(d.recipients);
      setName(d.name);
      setNote(d.note);
      setErrors({});
    },
    start,
  );

  const update = (i: number, patch: Partial<LeftoverItem>) =>
    setItems((cur) => cur.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  function addRecipient() {
    const n = name.trim();
    if (n && !recipients.includes(n)) setRecipients([...recipients, n]);
    setName("");
    setErrors((e) => ({ ...e, recipients: "" }));
  }

  const totalPortions = items.reduce((s, i) => s + (Number(i.portions) || 0), 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const pending = name.trim();
    const people = pending && !recipients.includes(pending) ? [...recipients, pending] : recipients;
    const parsed = transferSchema.safeParse({ date, items, recipients: people });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await onSubmit(parsed.data, note);
      draft.clear();
    } catch (err) {
      setErrors({ form: errorText(err) });
      setBusy(false);
    }
  }

  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <form onSubmit={submit} className="grid gap-6" noValidate>
      <DraftNotice restoredAt={draft.restoredAt} onDiscard={draft.discard} />
      <datalist id="dish-options">
        {dishOptions.map((d) => <option key={d} value={d} />)}
      </datalist>

      <Card>
        <CardHeader>
          <StepTitle n={1} title={t("transfer.items")}
            extra={<span className="rounded-full bg-secondary px-3 py-1 text-xs">{t("transfer.summary", { guests: guestCount, portions: totalPortions })}</span>} />
        </CardHeader>
        <CardContent className="grid gap-3">
          <Field label={t("transfer.date")} htmlFor="date" error={errors.date} className="sm:max-w-xs">
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <div className="hidden grid-cols-12 gap-2 px-2 pt-2 text-xs tracking-wide text-muted-foreground uppercase sm:grid">
            <span className="col-span-5">{t("transfer.dish")}</span>
            <span className="col-span-2">{t("transfer.portions")}</span>
            <span className="col-span-4">{t("supply.note")}</span>
          </div>
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 items-start gap-2 rounded-lg border bg-muted/30 p-2">
              <Field error={errors[`items.${i}.dish`]} className="col-span-12 sm:col-span-5">
                <Input list="dish-options" placeholder={t("transfer.dish")} className="bg-card" value={it.dish}
                  aria-invalid={!!errors[`items.${i}.dish`]} onChange={(e) => update(i, { dish: e.target.value })} />
              </Field>
              <Field error={errors[`items.${i}.portions`]} className="col-span-10 sm:col-span-2">
                <div className="relative">
                  <Users className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="number" min={0} inputMode="numeric" className="bg-card pl-9" aria-label={t("transfer.portions")}
                    value={it.portions || ""} aria-invalid={!!errors[`items.${i}.portions`]}
                    onChange={(e) => update(i, { portions: Math.max(0, parseInt(e.target.value) || 0) })} />
                </div>
              </Field>
              <Button type="button" variant="ghost" size="icon" aria-label={t("remove")}
                className="col-span-2 justify-self-end text-destructive hover:text-destructive sm:order-last sm:col-span-1"
                onClick={() => setItems((cur) => cur.filter((_, j) => j !== i))}>
                <Trash2 />
              </Button>
              <Input className="col-span-12 bg-card sm:col-span-4" placeholder={t("supply.note")} value={it.note}
                onChange={(e) => update(i, { note: e.target.value })} />
            </div>
          ))}
          {errors.items && <p className="text-sm text-destructive">{t(errors.items as TKey)}</p>}
          <div>
            <Button type="button" variant="outline" onClick={() => setItems((cur) => [...cur, { dish: "", portions: 1, note: "" }])}>
              <Plus /> {t("transfer.addRow")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <StepTitle n={2} title={t("transfer.recipients")} />
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex gap-2">
            <Input placeholder={t("transfer.recipientPh")} value={name} aria-invalid={!!errors.recipients}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRecipient(); } }} />
            <Button type="button" onClick={addRecipient}><UserPlus /> {t("transfer.add")}</Button>
          </div>
          {errors.recipients && <p className="text-sm text-destructive">{t(errors.recipients as TKey)}</p>}
          {recipients.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recipients.map((r) => (
                <button type="button" key={r} onClick={() => setRecipients(recipients.filter((x) => x !== r))}
                  className="inline-flex items-center gap-1 rounded-full bg-forest py-1 pr-2 pl-3 text-xs text-cream">
                  {r} <X className="size-3.5" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4">
          <Field label={t("supply.chefNote")} htmlFor="t-note">
            <Textarea id="t-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          {hasErrors && (
            <p className="text-sm text-destructive">{errors.form || t("v.fix")}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="accent" size="lg" disabled={busy}>
              <Send /> {busy ? t("saving") : submitLabel}
            </Button>
            {onCancel && <Button type="button" variant="outline" size="lg" onClick={() => { draft.clear(); onCancel(); }}>{t("cancel")}</Button>}
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
