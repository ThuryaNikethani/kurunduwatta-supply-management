"use client";

import { Plus, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { round } from "@/lib/calc";
import { today, unitLabel } from "@/lib/format";
import { errorText, useI18n, type TKey } from "@/lib/i18n";
import { fieldErrors, supplySchema } from "@/lib/schemas";
import { AUDIENCES, UNITS, type Audience, type SupplyItem, type SupplyList, type Unit } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Field } from "./common";
import { DraftNotice } from "./DraftNotice";
import { useDraft } from "@/lib/draft";

/** An empty row for the chef to write one item in. */
const blankItem = (): SupplyItem => ({ name: "", qty: 0, unit: "kg", note: "", calculated: null });

/** "allday" = breakfast, lunch and dinner. Older lists may still say "other". */
export const MEALS = ["breakfast", "lunch", "dinner", "hightea", "bbq", "allday"] as const;

/** Last people count and meal the chef used, to start the next new list with. */
const LAST_KEY = "kw-last-supply";
function lastUsed(): { guestCount?: number; meal?: string } {
  try {
    return JSON.parse(localStorage.getItem(LAST_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export type SupplyFormData = Pick<SupplyList, "audience" | "title" | "eventDate" | "meal" | "guestCount" | "days" | "dishes" | "items">;

export function UnitSelect({ value, onChange, className }: { value: Unit; onChange: (u: Unit) => void; className?: string }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Unit)}>
      <SelectTrigger className={cn("w-full bg-card", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {UNITS.map((u) => (
          <SelectItem key={u} value={u}>{unitLabel(u)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SupplyForm({
  initial, submitLabel, onSubmit, onCancel, draftKey,
}: {
  initial?: SupplyFormData;
  /** Where unsent input is kept so a refresh doesn't lose it. */
  draftKey: string;
  submitLabel: string;
  onSubmit: (data: SupplyFormData, note: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const { t } = useI18n();
  const [last] = useState(() => (initial ? {} : lastUsed()));
  const [audience, setAudience] = useState<Audience>(initial?.audience ?? "guests");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [eventDate, setEventDate] = useState(initial?.eventDate ?? today());
  const [meal, setMeal] = useState(initial?.meal ?? last.meal ?? "lunch");
  const [guestCount, setGuestCount] = useState<number>(initial?.guestCount ?? last.guestCount ?? 10);
  /** Staff lists: how many days the order covers. */
  const [days, setDays] = useState<number>(initial?.days ?? 1);
  // The chef always writes the items by hand; nothing is picked or worked out from dishes.
  const [items, setItems] = useState<SupplyItem[]>(initial?.items?.length ? initial.items : [blankItem()]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  type Draft = SupplyFormData & { note: string };
  const [start] = useState<Draft>(() => ({
    audience: initial?.audience ?? "guests",
    title: initial?.title ?? "",
    eventDate: initial?.eventDate ?? today(),
    meal: initial?.meal ?? last.meal ?? "lunch",
    guestCount: initial?.guestCount ?? last.guestCount ?? 10,
    days: initial?.days ?? 1,
    dishes: [],
    items: initial?.items?.length ? initial.items : [blankItem()],
    note: "",
  }));
  const draft = useDraft<Draft>(
    draftKey,
    { audience, title, eventDate, meal, guestCount, days, dishes: [], items, note },
    (d) => {
      setAudience(d.audience ?? "guests");
      setTitle(d.title);
      setEventDate(d.eventDate);
      setMeal(d.meal);
      setGuestCount(d.guestCount);
      setDays(d.days ?? 1);
      setItems(d.items?.length ? d.items : [blankItem()]);
      setNote(d.note);
      setErrors({});
    },
    start,
  );

  const update = (i: number, patch: Partial<SupplyItem>) =>
    setItems((cur) => cur.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = supplySchema.safeParse({
      audience,
      title: audience === "staff" ? t("supply.staffTitle", { n: days }) : title.trim() || t("supply.autoTitle", { n: guestCount }),
      eventDate,
      meal: audience === "staff" ? "other" : meal,
      guestCount,
      days,
      // Hand-written lists name no dishes, only items.
      dishes: [],
      items: items.map((it) => ({ ...it, qty: round(Number(it.qty)), calculated: it.calculated ?? null })),
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await onSubmit(parsed.data as SupplyFormData, note);
      draft.clear();
      if (!initial && audience === "guests") {
        try { localStorage.setItem(LAST_KEY, JSON.stringify({ guestCount, meal })); } catch {}
      }
    } catch (err) {
      setErrors({ form: errorText(err) });
      setBusy(false);
    }
  }

  const hasErrors = Object.values(errors).some(Boolean);
  const isStaff = audience === "staff";


  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DraftNotice restoredAt={draft.restoredAt} onDiscard={draft.discard} />

      <Card>
        <CardContent className="grid gap-6">
          {/* who, how many, when */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Field label={t("simple.who")} className="col-span-2 lg:col-span-1">
              <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
                <SelectTrigger id="who" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIENCES.map((a) => <SelectItem key={a} value={a}>{t(a === "staff" ? "audience.staff" : "audience.guests")}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t(isStaff ? "supply.staffCount" : "supply.guests")} htmlFor="guests" error={errors.guestCount}>
              <Input id="guests" type="number" inputMode="numeric" min={1} value={guestCount || ""} aria-invalid={!!errors.guestCount}
                onChange={(e) => { const v = Math.max(0, parseInt(e.target.value) || 0); setGuestCount(v); }} />
            </Field>
            <Field label={t("simple.days")} htmlFor="days" error={errors.days}>
              <Input id="days" type="number" inputMode="numeric" min={1} value={days || ""} aria-invalid={!!errors.days}
                onChange={(e) => { const v = Math.max(0, parseInt(e.target.value) || 0); setDays(v); }} />
            </Field>
            {!isStaff && (
              <Field label={t("supply.meal")}>
                <Select value={meal} onValueChange={setMeal}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MEALS.map((m) => <SelectItem key={m} value={m}>{t(`meal.${m}` as TKey)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field label={t("simple.date")} htmlFor="date" error={errors.eventDate} className={cn(isStaff && "col-span-2 lg:col-span-1")}>
              <Input id="date" type="date" value={eventDate} aria-invalid={!!errors.eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </Field>
            {!isStaff && (
              <Field label={t("supply.title")} htmlFor="title" error={errors.title} className="col-span-2 lg:col-span-3">
                <Input id="title" placeholder={t("supply.titlePh")} value={title} aria-invalid={!!errors.title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
            )}
          </div>

          {/* items */}
          <div className="grid gap-2 border-t pt-5">
            <p className="text-lg font-semibold">{t("simple.items")}</p>
            {items.length === 0 && (
              <p className="rounded-lg border border-dashed p-4 text-center text-muted-foreground">
                {t("supply.noItemsManual")}
              </p>
            )}
            {items.map((it, i) => {
              const changed = it.calculated != null && Number(it.qty) !== it.calculated;
              return (
                <div key={i} className={cn(
                  "grid grid-cols-[1fr_1fr_auto] items-start gap-2 border-b pb-3 sm:grid-cols-[1fr_5rem_6.5rem_auto] sm:border-0 sm:pb-0",
                  changed && "rounded-lg bg-amber/10")}>
                  <Field error={errors[`items.${i}.name`]} className="col-span-3 sm:col-span-1">
                    <Input aria-label={t("supply.item")} placeholder={t("supply.item")} value={it.name} aria-invalid={!!errors[`items.${i}.name`]}
                      onChange={(e) => update(i, { name: e.target.value })} />
                  </Field>
                  <Field error={errors[`items.${i}.qty`]}>
                    <Input type="number" step="any" min={0} inputMode="decimal" placeholder={t("supply.qty")} className="px-2"
                      value={it.qty || ""} aria-invalid={!!errors[`items.${i}.qty`]}
                      onChange={(e) => update(i, { qty: e.target.value === "" ? 0 : Number(e.target.value) })} />
                  </Field>
                  <UnitSelect value={it.unit} onChange={(unit) => update(i, { unit })} className="px-2" />
                  <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                    aria-label={t("remove")} onClick={() => setItems((cur) => cur.filter((_, j) => j !== i))}>
                    <Trash2 />
                  </Button>
                </div>
              );
            })}
            {errors.items && <p className="text-sm text-destructive">{t(errors.items as TKey)}</p>}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline"
                onClick={() => setItems((cur) => [...cur, blankItem()])}>
                <Plus /> {t("simple.addItem")}
              </Button>
            </div>
          </div>

          {/* note + send */}
          <div className="grid gap-3 border-t pt-5">
            <Field label={t("supply.chefNote")} htmlFor="chef-note">
              <Textarea id="chef-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            {hasErrors && <p role="alert" className="rounded-lg bg-destructive/10 p-3 font-medium text-destructive">{errors.form || t("v.fix")}</p>}
            <div className="flex gap-2">
              {onCancel && (
                <Button type="button" variant="outline" className="h-14 text-base" onClick={() => { draft.clear(); onCancel(); }}>{t("cancel")}</Button>
              )}
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
