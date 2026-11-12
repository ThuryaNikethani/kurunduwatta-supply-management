"use client";

import Link from "next/link";
import { BookOpen, Check, HardHat, Plus, RefreshCw, Search, Send, Trash2, TriangleAlert, Users, X } from "lucide-react";
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

const blankItem = (): SupplyItem => ({ name: "", qty: 0, unit: "kg", note: "", calculated: null });

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

/** A numbered heading inside the form. */
function Part({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <span className="flex size-7 items-center justify-center rounded-full bg-forest text-sm text-amber">{n}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * One plain page: who, how many, food, items, send. Nothing is folded away.
 * Picking dishes fills the items straight away (per person × people × days).
 */
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
  const [audience, setAudience] = useState<Audience>(initial?.audience ?? "guests");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [eventDate, setEventDate] = useState(initial?.eventDate ?? today());
  const [meal, setMeal] = useState(initial?.meal ?? "lunch");
  const [guestCount, setGuestCount] = useState<number>(initial?.guestCount ?? 10);
  /** How many days the order covers. */
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
    meal: initial?.meal ?? "lunch",
    guestCount: initial?.guestCount ?? 10,
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
  /** True while the list is exactly what was last worked out (or empty). */
  const untouched = () => !items.length || JSON.stringify(items) === lastCalc.current;

  /** Amounts for every person for every day: per person × people × days. */
  function calcFor(people: number, numDays: number, ids: Set<string> = selected) {
    const ready = (recipes.data ?? []).filter((r) => ids.has(r.id) && r.ingredients?.length);
    if (!ready.length || people < 1 || numDays < 1) return null;
    const out = calculateItems(ready, people * numDays);
    lastCalc.current = JSON.stringify(out);
    return out;
  }

  const missingRecipes = (ids: Set<string>) =>
    (recipes.data ?? []).filter((r) => ids.has(r.id) && !r.ingredients?.length).map((r) => r.name);

  function calculate() {
    setNoRecipe(missingRecipes(selected));
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

  /** Picking or dropping a dish redoes the list straight away, unless the chef has edited it. */
  function toggleDish(id: string, name: string) {
    const next = selected.has(id) ? dishes.filter((d) => d.id !== id) : [...dishes, { id, name }];
    setDishes(next);
    const ids = new Set(next.map((d) => d.id));
    setNoRecipe(missingRecipes(ids));
    if (manual || !untouched()) return;
    const out = calcFor(guestCount, days, ids);
    lastCalc.current = JSON.stringify(out ?? []);
    setItems(out ?? []);
    if (out) setErrors((e) => ({ ...e, items: "" }));
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
    setItems(on && !otherItems.length ? [blankItem()] : otherItems);
    setOtherItems(items);
  }

  function pickAudience(a: Audience) {
    if (a === audience) return;
    setAudience(a);
    const menuOf = new Map((recipes.data ?? []).map((r) => [r.id, r.menu ?? "guests"]));
    setDishes((cur) => cur.filter((d) => (menuOf.get(d.id) ?? a) === a));
    setNoRecipe(null);
    // Staff meals are written by hand only; guests go back to picking dishes.
    chooseManual(a === "staff");
  }

  function addOwnDish() {
    const name = dishInput.trim();
    if (!name) return;
    setOwnDishes((cur) => (cur.includes(name) ? cur : [...cur, name]));
    setDishInput("");
  }

  const update = (i: number, patch: Partial<SupplyItem>) =>
    setItems((cur) => cur.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const toNumber = (v: string) => Math.max(0, parseInt(v) || 0);

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
    } catch (err) {
      setErrors({ form: errorText(err) });
      setBusy(false);
    }
  }

  const hasErrors = Object.values(errors).some(Boolean);
  const isStaff = audience === "staff";

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <DraftNotice restoredAt={draft.restoredAt} onDiscard={draft.discard} />

      <Card>
        <CardContent className="grid gap-8">
          {/* 1. who and how many */}
          <Part n={1} title={t("wiz.who")}>
            <div role="radiogroup" aria-label={t("wiz.who")} className="grid grid-cols-2 gap-2">
              {AUDIENCES.map((a) => {
                const on = audience === a;
                const Icon = a === "staff" ? HardHat : Users;
                return (
                  <button key={a} type="button" role="radio" aria-checked={on} onClick={() => pickAudience(a)}
                    className={cn(
                      "flex h-12 items-center justify-center gap-2 rounded-xl border-2 px-2 font-semibold transition",
                      on ? "border-amber bg-amber text-forest" : "border-border bg-card text-muted-foreground hover:border-amber/50",
                    )}>
                    <Icon className="size-5 shrink-0" />
                    {t(a === "staff" ? "audience.staff" : "audience.guests")}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label={t(isStaff ? "supply.staffCount" : "supply.guests")} htmlFor="guests" error={errors.guestCount}>
                <Input id="guests" type="number" inputMode="numeric" min={1} value={guestCount || ""} className="h-12 text-lg"
                  aria-invalid={!!errors.guestCount}
                  onChange={(e) => { const v = toNumber(e.target.value); setGuestCount(v); recalcIfUntouched(v, days); }} />
              </Field>
              <Field label={t("wiz.daysShort")} htmlFor="days" error={errors.days}>
                <Input id="days" type="number" inputMode="numeric" min={1} value={days || ""} className="h-12 text-lg"
                  aria-invalid={!!errors.days}
                  onChange={(e) => { const v = toNumber(e.target.value); setDays(v); recalcIfUntouched(guestCount, v); }} />
              </Field>
              <Field label={t("supply.orderDate")} htmlFor="date" error={errors.eventDate} className={cn(isStaff && "col-span-2")}>
                <Input id="date" type="date" value={eventDate} aria-invalid={!!errors.eventDate} className="h-12"
                  onChange={(e) => setEventDate(e.target.value)} />
              </Field>
              {!isStaff && (
                <Field label={t("supply.meal")}>
                  <Select value={meal} onValueChange={setMeal}>
                    <SelectTrigger className="h-12! w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MEALS.map((m) => <SelectItem key={m} value={m}>{t(`meal.${m}` as TKey)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </div>
            {!isStaff && (
              <Field label={`${t("supply.title")} ${t("wiz.optional")}`} htmlFor="title" error={errors.title}>
                <Input id="title" placeholder={t("supply.titlePh")} value={title} aria-invalid={!!errors.title} className="h-12"
                  onChange={(e) => setTitle(e.target.value)} />
              </Field>
            )}
          </Part>

          {/* 2. food */}
          <Part n={2} title={t(manual ? "supply.ownDishes" : "wiz.food")}>
            {!isStaff && (
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border bg-muted/30 p-3">
                <input type="checkbox" className="size-5 accent-amber-600" checked={manual}
                  onChange={(e) => chooseManual(e.target.checked)} />
                <span className="font-medium">{t("wiz.handWrite")}</span>
              </label>
            )}
            {manual ? (
              <div className="grid gap-3">
                <div className="flex gap-2">
                  <Input id="own-dish" aria-label={t("supply.ownDishes")} placeholder={t("supply.ownDishPh")} value={dishInput} className="h-12"
                    onChange={(e) => setDishInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOwnDish(); } }} />
                  <Button type="button" variant="outline" className="h-12" disabled={!dishInput.trim()} onClick={addOwnDish}>
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
              </div>
            ) : (
              <div className="grid gap-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
                  <Input className="h-12 pl-10" placeholder={t("supply.searchDish")} value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                {!recipes.data ? (
                  <Skeleton className="h-40" />
                ) : grouped.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("recipes.empty")}</p>
                ) : (
                  <div className="grid max-h-80 gap-4 overflow-y-auto rounded-xl border bg-muted/40 p-3">
                    {grouped.map(([cat, list]) => (
                      <div key={cat}>
                        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">{cat}</p>
                        <div className="flex flex-wrap gap-2">
                          {list.map((r) => {
                            const on = selected.has(r.id);
                            return (
                              <button type="button" key={r.id} onClick={() => toggleDish(r.id, r.name)} aria-pressed={on}
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-left transition",
                                  on ? "border-amber bg-amber font-semibold text-forest" : "border-border bg-card hover:border-amber/60",
                                )}>
                                {on && <Check className="size-4" />}
                                {r.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Part>

          {/* 3. items */}
          <Part n={3} title={t("wiz.items")}>
            {!manual && noRecipe && noRecipe.length > 0 && (
              <div role="alert" className="flex gap-3 rounded-xl border border-amber/60 bg-amber/10 p-3 text-sm">
                <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-deep" />
                <div className="grid gap-1">
                  <p className="font-medium">{t(noRecipe.length === dishes.length ? "supply.noRecipeAll" : "supply.noRecipeSome")}</p>
                  <p className="text-muted-foreground">{noRecipe.join(" · ")}</p>
                  <p className="text-muted-foreground">{t("supply.noRecipeHelp")}</p>
                  <Link href="/recipes" target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-medium text-amber-deep underline underline-offset-4">
                    <BookOpen className="size-4" /> {t("supply.addRecipes")}
                  </Link>
                </div>
              </div>
            )}

            {items.length === 0 ? (
              <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                {t(manual ? "supply.noItemsManual" : "wiz.pickFirst")}
              </p>
            ) : (
              <div className="grid gap-2">
                <div className="hidden grid-cols-12 gap-2 px-2 text-xs text-muted-foreground sm:grid">
                  <span className="col-span-5">{t("supply.item")}</span>
                  <span className="col-span-2">{t("supply.qty")}</span>
                  <span className="col-span-2">{t("supply.unit")}</span>
                  <span className="col-span-2">{t("supply.note")}</span>
                </div>
                {items.map((it, i) => {
                  const changed = it.calculated != null && Number(it.qty) !== it.calculated;
                  return (
                    <div key={i} className={cn("grid grid-cols-12 items-start gap-2 rounded-xl border p-2", changed ? "border-amber/50 bg-amber/10" : "bg-muted/30")}>
                      <Field error={errors[`items.${i}.name`]} className="col-span-12 sm:col-span-5">
                        <Input placeholder={t("supply.item")} value={it.name} aria-invalid={!!errors[`items.${i}.name`]}
                          className="h-11 bg-card" onChange={(e) => update(i, { name: e.target.value })} />
                      </Field>
                      <Field error={errors[`items.${i}.qty`]} className="col-span-5 sm:col-span-2">
                        <Input type="number" step="any" min={0} inputMode="decimal" placeholder={t("supply.qty")} className="h-11 bg-card"
                          value={it.qty || ""} aria-invalid={!!errors[`items.${i}.qty`]}
                          onChange={(e) => update(i, { qty: e.target.value === "" ? 0 : Number(e.target.value) })} />
                      </Field>
                      <div className="col-span-5 sm:col-span-2">
                        <UnitSelect value={it.unit} onChange={(unit) => update(i, { unit })} className="h-11!" />
                      </div>
                      <Input className="col-span-10 h-11 bg-card sm:col-span-2" placeholder={t("supply.note")} value={it.note}
                        onChange={(e) => update(i, { note: e.target.value })} />
                      <Button type="button" variant="ghost" size="icon-lg" className="col-span-2 justify-self-end text-destructive hover:text-destructive sm:col-span-1"
                        aria-label={t("remove")} onClick={() => setItems((cur) => cur.filter((_, j) => j !== i))}>
                        <Trash2 />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            {errors.items && <p className="text-sm text-destructive">{t(errors.items as TKey)}</p>}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setItems((cur) => [...cur, blankItem()])}>
                <Plus /> {t("supply.addItem")}
              </Button>
              {!manual && (
                <Button type="button" variant="outline" disabled={!dishes.length} onClick={onCalculateClick}>
                  <RefreshCw /> {t("wiz.recalc")}
                </Button>
              )}
            </div>
          </Part>

          {/* 4. note */}
          <Part n={4} title={t("supply.chefNote")}>
            <Textarea id="chef-note" aria-label={t("supply.chefNote")} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Part>

          {hasErrors && <p className="text-sm text-destructive">{errors.form || t("v.fix")}</p>}

          <div className="flex gap-2">
            {onCancel && (
              <Button type="button" variant="outline" className="h-12 text-base" onClick={() => { draft.clear(); onCancel(); }}>
                {t("cancel")}
              </Button>
            )}
            <Button type="submit" variant="accent" className="h-12 flex-1 text-base" disabled={busy}>
              <Send /> {busy ? t("saving") : submitLabel}
            </Button>
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
