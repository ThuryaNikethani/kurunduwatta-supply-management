"use client";

import { useState } from "react";
import { today } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { LeftoverItem, TransferOut } from "@/lib/types";

export type TransferFormData = Pick<TransferOut, "date" | "items" | "recipients">;

export function TransferForm({
  dishOptions, guestCount, initial, submitLabel, onSubmit, onCancel,
}: {
  dishOptions: string[];
  guestCount: number;
  initial?: TransferFormData;
  submitLabel: string;
  onSubmit: (data: TransferFormData, note: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const { t } = useI18n();
  const [date, setDate] = useState(initial?.date ?? today());
  const [items, setItems] = useState<LeftoverItem[]>(
    initial?.items ?? [{ dish: dishOptions[0] ?? "", portions: 1, note: "" }],
  );
  const [recipients, setRecipients] = useState<string[]>(initial?.recipients ?? []);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const update = (i: number, patch: Partial<LeftoverItem>) =>
    setItems((cur) => cur.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  function addRecipient() {
    const n = name.trim();
    if (n && !recipients.includes(n)) setRecipients([...recipients, n]);
    setName("");
  }

  const totalPortions = items.reduce((s, i) => s + (Number(i.portions) || 0), 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = items
      .filter((i) => i.dish.trim() && Number(i.portions) > 0)
      .map((i) => ({ dish: i.dish.trim(), portions: Number(i.portions), note: i.note.trim() }));
    const people = name.trim() && !recipients.includes(name.trim()) ? [...recipients, name.trim()] : recipients;
    if (!clean.length || !people.length || !date) {
      setError(t("transfer.missing"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSubmit({ date, items: clean, recipients: people }, note);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <datalist id="dish-options">
        {dishOptions.map((d) => <option key={d} value={d} />)}
      </datalist>

      <div className="card grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">{t("transfer.date")}</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="flex items-end">
          <p className="rounded-xl bg-mist px-3 py-2 text-sm">{t("transfer.summary", { guests: guestCount, portions: totalPortions })}</p>
        </div>
      </div>

      <div className="card">
        <h2 className="h2 mb-3">{t("transfer.items")}</h2>
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 rounded-xl bg-cream/60 p-2">
              <input list="dish-options" className="input col-span-12 sm:col-span-5" placeholder={t("transfer.dish")}
                value={it.dish} onChange={(e) => update(i, { dish: e.target.value })} />
              <div className="col-span-6 sm:col-span-2">
                <input type="number" min={0} className="input" aria-label={t("transfer.portions")} value={it.portions}
                  onChange={(e) => update(i, { portions: Math.max(0, parseInt(e.target.value) || 0) })} />
              </div>
              <input className="input col-span-12 sm:col-span-4" placeholder={t("supply.note")} value={it.note}
                onChange={(e) => update(i, { note: e.target.value })} />
              <button type="button" className="col-span-6 text-xs text-danger sm:col-span-1"
                onClick={() => setItems((cur) => cur.filter((_, j) => j !== i))}>
                {t("remove")}
              </button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">{t("transfer.portions")}</p>
        <button type="button" className="btn-outline mt-3"
          onClick={() => setItems((cur) => [...cur, { dish: "", portions: 1, note: "" }])}>
          + {t("transfer.addRow")}
        </button>
      </div>

      <div className="card">
        <h2 className="h2 mb-3">{t("transfer.recipients")}</h2>
        <div className="flex gap-2">
          <input className="input" placeholder={t("transfer.recipientPh")} value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRecipient(); } }} />
          <button type="button" className="btn-dark" onClick={addRecipient}>{t("transfer.add")}</button>
        </div>
        {recipients.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {recipients.map((r) => (
              <button type="button" key={r} onClick={() => setRecipients(recipients.filter((x) => x !== r))}
                className="rounded-full bg-forest px-3 py-1 text-xs text-cream">
                {r} ✕
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <label className="label">{t("supply.chefNote")}</label>
        <textarea rows={3} className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" disabled={busy}>{busy ? t("saving") : submitLabel}</button>
          {onCancel && <button type="button" className="btn-outline" onClick={onCancel}>{t("cancel")}</button>}
        </div>
      </div>
    </form>
  );
}
