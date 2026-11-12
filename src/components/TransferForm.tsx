"use client";

import { Plus, Send, Trash2, UserPlus, Users, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { today } from "@/lib/format";
import { errorText, useI18n, type TKey } from "@/lib/i18n";
import { fieldErrors, transferSchema } from "@/lib/schemas";
import type { LeftoverItem, TransferOut } from "@/lib/types";
import { Field } from "./common";
import { DraftNotice } from "./DraftNotice";
import { useDraft } from "@/lib/draft";

export type TransferFormData = Pick<TransferOut, "date" | "items" | "recipients">;

/** The people who took leftovers last time, to start the next form with. */
const LAST_KEY = "kw-last-recipients";
function lastRecipients(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(LAST_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

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
  const [recipients, setRecipients] = useState<string[]>(() => initial?.recipients ?? lastRecipients());
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
      try { localStorage.setItem(LAST_KEY, JSON.stringify(parsed.data.recipients)); } catch {}
    } catch (err) {
      setErrors({ form: errorText(err) });
      setBusy(false);
    }
  }

  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DraftNotice restoredAt={draft.restoredAt} onDiscard={draft.discard} />
      <datalist id="dish-options">
        {dishOptions.map((d) => <option key={d} value={d} />)}
      </datalist>

      <Card>
        <CardContent className="grid gap-6">
          {/* date */}
          <Field label={t("transfer.date")} htmlFor="date" error={errors.date} className="sm:max-w-xs">
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>

          {/* food left over */}
          <div className="grid gap-2 border-t pt-5">
            <p className="text-lg font-semibold">{t("transfer.items")}</p>
            <p className="text-sm text-muted-foreground">{t("transfer.summary", { guests: guestCount, portions: totalPortions })}</p>
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] items-start gap-2 border-b pb-3 sm:grid-cols-[1fr_7rem_auto] sm:border-0 sm:pb-0">
                <Field error={errors[`items.${i}.dish`]} className="col-span-2 sm:col-span-1">
                  <Input list="dish-options" aria-label={t("transfer.dish")} placeholder={t("transfer.dish")} value={it.dish}
                    aria-invalid={!!errors[`items.${i}.dish`]} onChange={(e) => update(i, { dish: e.target.value })} />
                </Field>
                <Field error={errors[`items.${i}.portions`]}>
                  <div className="relative">
                    <Users className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type="number" min={0} inputMode="numeric" className="pl-9" aria-label={t("transfer.portions")}
                      value={it.portions || ""} aria-invalid={!!errors[`items.${i}.portions`]}
                      onChange={(e) => update(i, { portions: Math.max(0, parseInt(e.target.value) || 0) })} />
                  </div>
                </Field>
                <Button type="button" variant="ghost" size="icon" aria-label={t("remove")} className="text-destructive hover:text-destructive"
                  onClick={() => setItems((cur) => cur.filter((_, j) => j !== i))}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            {errors.items && <p className="text-sm text-destructive">{t(errors.items as TKey)}</p>}
            <div>
              <Button type="button" variant="outline" onClick={() => setItems((cur) => [...cur, { dish: "", portions: 1, note: "" }])}>
                <Plus /> {t("transfer.addRow")}
              </Button>
            </div>
          </div>

          {/* who took it */}
          <div className="grid gap-2 border-t pt-5">
            <p className="text-lg font-semibold">{t("transfer.recipients")}</p>
            <div className="flex gap-2">
              <Input placeholder={t("transfer.recipientPh")} value={name} aria-invalid={!!errors.recipients}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRecipient(); } }} />
              <Button type="button" variant="outline" className="h-11" onClick={addRecipient}><UserPlus /> {t("transfer.add")}</Button>
            </div>
            {errors.recipients && <p className="text-sm text-destructive">{t(errors.recipients as TKey)}</p>}
            {recipients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recipients.map((r) => (
                  <button type="button" key={r} aria-label={`${t("remove")}: ${r}`} onClick={() => setRecipients(recipients.filter((x) => x !== r))}
                    className="inline-flex items-center gap-1 rounded-full bg-forest py-1.5 pr-2 pl-3 text-sm text-cream">
                    {r} <X className="size-4" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* note + send */}
          <div className="grid gap-3 border-t pt-5">
            <Field label={t("supply.chefNote")} htmlFor="t-note">
              <Textarea id="t-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            {hasErrors && <p role="alert" className="rounded-lg bg-destructive/10 p-3 font-medium text-destructive">{errors.form || t("v.fix")}</p>}
            <div className="flex gap-2">
              {onCancel && <Button type="button" variant="outline" className="h-14 text-base" onClick={() => { draft.clear(); onCancel(); }}>{t("cancel")}</Button>}
              <Button type="submit" variant="accent" className="h-14 flex-1 text-lg" disabled={busy}>
                <Send className="size-5" /> {busy ? t("saving") : submitLabel}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
