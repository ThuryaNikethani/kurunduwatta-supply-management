"use client";

import { Check, Plus, RefreshCw, Search, Send, Trash2, TriangleAlert, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { calculateItems, round } from "@/lib/calc";
import { today, unitLabel } from "@/lib/format";
import { useRecipes } from "@/lib/hooks";
import { errorText, useI18n, type TKey } from "@/lib/i18n";
import { fieldErrors, supplySchema } from "@/lib/schemas";
import { AUDIENCES, UNITS, type Audience, type DishRef, type Recipe, type SupplyItem, type SupplyList, type Unit } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Field } from "./common";
import { DraftNotice } from "./DraftNotice";
import { useDraft } from "@/lib/draft";

/** Dishes the chef typed in a hand-written list (not from the menu). */
const OWN = "own:";
const isOwn = (d: DishRef) => d.id.startsWith(OWN);
/** A hand-written list has no menu dishes, only ones the chef typed. */
const wasManual = (d?: SupplyFormData) => !!d?.items.length && d.dishes.every(isOwn);
/** Staff lists are always written by hand (no dish calculation). */
const startManual = (d?: SupplyFormData) => d?.audience === "staff" || wasManual(d);

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
  const recipes = useRecipes();
  const [last] = useState(() => (initial ? {} : lastUsed()));
  const [audience, setAudience] = useState<Audience>(initial?.audience ?? "guests");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [eventDate, setEventDate] = useState(initial?.eventDate ?? today());
  const [meal, setMeal] = useState(initial?.meal ?? last.meal ?? "lunch");
  const [guestCount, setGuestCount] = useState<number>(initial?.guestCount ?? last.guestCount ?? 10);
  /** Staff lists: how many days the order covers. */
  const [days, setDays] = useState<number>(initial?.days ?? 1);
  const [dishes, setDishes] = useState<DishRef[]>(startManual(initial) ? [] : (initial?.dishes ?? []));
  const [items, setItems] = useState<SupplyItem[]>(initial?.items ?? []);
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmRecalc, setConfirmRecalc] = useState(false);
  /** Dishes picked for calculation that have no recipe yet. */
  const [noRecipe, setNoRecipe] = useState<string[] | null>(null);
  /** Write the items by hand instead of working them out from dishes. */
  const [manual, setManual] = useState(() => startManual(initial));
  /** The list for the way not shown right now (calculated vs hand-written). */
  const [otherItems, setOtherItems] = useState<SupplyItem[]>([]);
  /** Dish names typed by the chef for a hand-written list. */
  const [ownDishes, setOwnDishes] = useState<string[]>(() => (startManual(initial) ? initial!.dishes.map((d) => d.name) : []));
  const [dishInput, setDishInput] = useState("");

  type Draft = SupplyFormData & { note: string; manual?: boolean; otherItems?: SupplyItem[]; ownDishes?: string[] };
  const [start] = useState<Draft>(() => ({
    audience: initial?.audience ?? "guests",
    title: initial?.title ?? "",
    eventDate: initial?.eventDate ?? today(),
    meal: initial?.meal ?? last.meal ?? "lunch",
    guestCount: initial?.guestCount ?? last.guestCount ?? 10,
    days: initial?.days ?? 1,
    dishes: startManual(initial) ? [] : (initial?.dishes ?? []),
    items: initial?.items ?? [],
    note: "",
    manual: startManual(initial),
    otherItems: [],
    ownDishes: startManual(initial) ? initial!.dishes.map((d) => d.name) : [],
  }));
  const draft = useDraft<Draft>(
    draftKey,
    { audience, title, eventDate, meal, guestCount, days, dishes, items, note, manual, otherItems, ownDishes },
    (d) => {
      setAudience(d.audience ?? "guests");
      setTitle(d.title);
      setEventDate(d.eventDate);
      setMeal(d.meal);
      setGuestCount(d.guestCount);
      setDays(d.days ?? 1);
      setDishes(d.dishes);
      setItems(d.items);
      setNote(d.note);
      setManual(!!d.manual);
      setOtherItems(d.otherItems ?? []);
      setOwnDishes(d.ownDishes ?? []);
      setErrors({});
      setNoRecipe(null);
    },
    start,
  );

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, Recipe[]>();
    for (const r of recipes.data ?? []) {
      if ((r.menu ?? "guests") !== audience) continue;
      if (q && !r.name.toLowerCase().includes(q)) continue;
      map.set(r.category, [...(map.get(r.category) ?? []), r]);
    }
    return [...map.entries()];
  }, [recipes.data, search, audience]);

  const selected = new Set(dishes.map((d) => d.id));

  /** The last calculated list, to tell if the chef has changed it since. */
  const lastCalc = useRef("");

  /** Picking or dropping a dish redoes the list straight away, unless the chef has edited it. */
  function setDishList(next: DishRef[]) {
    setDishes(next);
    if (manual) return;
    const ids = new Set(next.map((d) => d.id));
    setNoRecipe((recipes.data ?? []).filter((r) => ids.has(r.id) && !r.ingredients?.length).map((r) => r.name));
    if (items.length && JSON.stringify(items) !== lastCalc.current) return;
    const out = calcFor(guestCount, days, ids);
    lastCalc.current = JSON.stringify(out ?? []);
    setItems(out ?? []);
    if (out) setErrors((e) => ({ ...e, items: "" }));
  }
  const toggleDish = (id: string, name: string) =>
    setDishList(selected.has(id) ? dishes.filter((d) => d.id !== id) : [...dishes, { id, name }]);

  /** Amounts for every person for every day: per person × people × days. */
  function calcFor(people: number, numDays: number, ids: Set<string> = selected) {
    const ready = (recipes.data ?? []).filter((r) => ids.has(r.id) && r.ingredients?.length);
    if (!ready.length || people < 1 || numDays < 1) return null;
    const out = calculateItems(ready, people * numDays);
    lastCalc.current = JSON.stringify(out);
    return out;
  }

  function calculate() {
    const chosen = (recipes.data ?? []).filter((r) => selected.has(r.id));
    setNoRecipe(chosen.filter((r) => !r.ingredients?.length).map((r) => r.name));
    // Nothing to calculate: keep whatever the chef already typed.
    const out = calcFor(guestCount, days);
    if (!out) return;
    setItems(out);
    setErrors((e) => ({ ...e, items: "" }));
  }

  /** Changing people or days updates a calculated list, unless the chef has edited it. */
  function recalcIfUntouched(people: number, numDays: number) {
    if (manual || !items.length || JSON.stringify(items) !== lastCalc.current) return;
    const out = calcFor(people, numDays);
    if (out) setItems(out);
  }

  /** Recalculating replaces the list, so ask first if it has items. */
  function onCalculateClick() {
    const anyRecipe = (recipes.data ?? []).some((r) => selected.has(r.id) && r.ingredients?.length);
    if (items.length && anyRecipe) setConfirmRecalc(true);
    else calculate();
  }

  function chooseManual(on: boolean) {
    if (on === manual) return;
    setManual(on);
    setNoRecipe(null);
    setErrors((e) => ({ ...e, items: "" }));
    // Each way keeps its own list: the hand-written one starts blank (nothing
    // calculated carried over), and switching back brings the other list back.
    setItems(on && !otherItems.length ? [{ name: "", qty: 0, unit: "kg", note: "", calculated: null }] : otherItems);
    setOtherItems(items);
  }

  function addOwnDish() {
    const name = dishInput.trim();
    if (!name) return;
    setOwnDishes((cur) => (cur.includes(name) ? cur : [...cur, name]));
    setDishInput("");
  }

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
      // A hand-written list isn't tied to any dishes.
      dishes: manual ? ownDishes.map((name) => ({ id: OWN + name, name })) : dishes,
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

  /** Guests or staff; staff lists are written by hand. */
  function pickAudience(a: Audience) {
    if (a === audience) return;
    setAudience(a);
    const menuOf = new Map((recipes.data ?? []).map((r) => [r.id, r.menu ?? "guests"]));
    setDishes((cur) => cur.filter((d) => (menuOf.get(d.id) ?? a) === a));
    setNoRecipe(null);
    chooseManual(a === "staff");
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DraftNotice restoredAt={draft.restoredAt} onDiscard={draft.discard} />

      <Card>
        <CardContent className="grid gap-6">
          {/* who, how many, when */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Field label={t("simple.who")} className="col-span-2 lg:col-span-1">
              <Select value={audience} onValueChange={(v) => pickAudience(v as Audience)}>
                <SelectTrigger id="who" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIENCES.map((a) => <SelectItem key={a} value={a}>{t(a === "staff" ? "audience.staff" : "audience.guests")}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t(isStaff ? "supply.staffCount" : "supply.guests")} htmlFor="guests" error={errors.guestCount}>
              <Input id="guests" type="number" inputMode="numeric" min={1} value={guestCount || ""} aria-invalid={!!errors.guestCount}
                onChange={(e) => { const v = Math.max(0, parseInt(e.target.value) || 0); setGuestCount(v); recalcIfUntouched(v, days); }} />
            </Field>
            <Field label={t("simple.days")} htmlFor="days" error={errors.days}>
              <Input id="days" type="number" inputMode="numeric" min={1} value={days || ""} aria-invalid={!!errors.days}
                onChange={(e) => { const v = Math.max(0, parseInt(e.target.value) || 0); setDays(v); recalcIfUntouched(guestCount, v); }} />
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

          {/* food */}
          <div className="grid gap-3 border-t pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-lg font-semibold">{t(manual ? "supply.ownDishes" : "simple.food")}</p>
              {!isStaff && (
                <label className="flex cursor-pointer items-center gap-2 text-base">
                  <input type="checkbox" className="size-5 accent-amber-600" checked={manual} onChange={(e) => chooseManual(e.target.checked)} />
                  {t("simple.handWrite")}
                </label>
              )}
            </div>
            {manual ? (
              <>
                <div className="flex gap-2">
                  <Input id="own-dish" aria-label={t("supply.ownDishes")} placeholder={t("supply.ownDishPh")} value={dishInput}
                    onChange={(e) => setDishInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOwnDish(); } }} />
                  <Button type="button" variant="outline" className="h-11" disabled={!dishInput.trim()} onClick={addOwnDish}>
                    <Plus /> {t("supply.ownDishAdd")}
                  </Button>
                </div>
                {ownDishes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {ownDishes.map((n) => (
                      <button type="button" key={n} aria-label={`${t("remove")}: ${n}`}
                        onClick={() => setOwnDishes((cur) => cur.filter((x) => x !== n))}
                        className="inline-flex items-center gap-1 rounded-full bg-forest py-1.5 pr-2 pl-3 text-sm text-cream">
                        {n} <X className="size-4" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-10" placeholder={t("supply.searchDish")} value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                {!recipes.data ? (
                  <Skeleton className="h-32" />
                ) : grouped.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("recipes.empty")}</p>
                ) : (
                  <div className="flex max-h-72 flex-wrap content-start gap-2 overflow-y-auto rounded-xl border bg-muted/30 p-3">
                    {grouped.flatMap(([, list]) => list).map((r) => {
                      const on = selected.has(r.id);
                      return (
                        <button type="button" key={r.id} onClick={() => toggleDish(r.id, r.name)} aria-pressed={on}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-base transition",
                            on ? "border-amber bg-amber font-semibold text-forest" : "border-border bg-card hover:border-amber/60",
                          )}>
                          {on && <Check className="size-4" />}
                          {r.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {noRecipe && noRecipe.length > 0 && (
                  <p role="alert" className="flex gap-2 rounded-lg bg-amber/15 p-3 text-sm">
                    <TriangleAlert className="size-5 shrink-0 text-amber-deep" />
                    <span>{t("simple.noRecipe", { names: noRecipe.join(", ") })}</span>
                  </p>
                )}
              </>
            )}
          </div>

          {/* items */}
          <div className="grid gap-2 border-t pt-5">
            <p className="text-lg font-semibold">{t("simple.items")}</p>
            {items.length === 0 && (
              <p className="rounded-lg border border-dashed p-4 text-center text-muted-foreground">
                {t(manual ? "supply.noItemsManual" : "simple.noItems")}
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
                onClick={() => setItems((cur) => [...cur, { name: "", qty: 0, unit: "kg", note: "", calculated: null }])}>
                <Plus /> {t("simple.addItem")}
              </Button>
              {!manual && dishes.length > 0 && (
                <Button type="button" variant="ghost" onClick={onCalculateClick}>
                  <RefreshCw /> {t("supply.recalc")}
                </Button>
              )}
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

      <AlertDialog open={confirmRecalc} onOpenChange={setConfirmRecalc}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("supply.recalcTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("supply.recalcWarn")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={calculate}>{t("supply.calculate")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
