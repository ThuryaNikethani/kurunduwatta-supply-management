"use client";

import Link from "next/link";
import { ArrowLeftRight, BookOpen, Calculator, Check, HardHat, PenLine, Plus, Search, Send, Trash2, TriangleAlert, Users, UtensilsCrossed, X } from "lucide-react";
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { calculateItems, round } from "@/lib/calc";
import { qty, today, unitLabel } from "@/lib/format";
import { useRecipes } from "@/lib/hooks";
import { errorText, useI18n, type TKey } from "@/lib/i18n";
import { fieldErrors, supplySchema } from "@/lib/schemas";
import { AUDIENCES, UNITS, type Audience, type DishRef, type Recipe, type SupplyItem, type SupplyList, type Unit } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmptyState, Field, StepTitle } from "./common";
import { DraftNotice } from "./DraftNotice";
import { RecipeEditor } from "./RecipeEditor";
import { CATEGORIES, STAFF_CATEGORIES } from "@/lib/menu";
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

/** Tapping a number box selects it, so a new number replaces the old one. */
const selectAll = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

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
  /** Showing both guests/staff choices; a saved list starts with its choice made. */
  const [picking, setPicking] = useState(!initial);
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
  const [addingDish, setAddingDish] = useState(false);
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
      setPicking(false);
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

  return (
    <form onSubmit={submit} className="grid gap-6" noValidate>
      <DraftNotice restoredAt={draft.restoredAt} onDiscard={draft.discard} />
      {/* 1. booking */}
      <Card>
        <CardHeader>
          <StepTitle n={1} title={t("supply.step1")} />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2 sm:col-span-2 lg:col-span-4">
            <p className="text-sm font-medium">{t("audience.question")}</p>
            <div role="radiogroup" aria-label={t("audience.question")}
              className={cn("grid gap-2", picking ? "sm:grid-cols-2" : "sm:grid-cols-[1fr_auto] sm:items-center")}>
              {/* Once chosen, only the choice stays; "change" brings both back. */}
              {(picking ? AUDIENCES : [audience]).map((a) => {
                const on = audience === a;
                const Icon = a === "staff" ? HardHat : Users;
                return (
                  <button
                    key={a}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setPicking(!picking);
                      if (a === audience) return;
                      setAudience(a);
                      const menuOf = new Map((recipes.data ?? []).map((r) => [r.id, r.menu ?? "guests"]));
                      setDishes((cur) => cur.filter((d) => (menuOf.get(d.id) ?? a) === a));
                      setNoRecipe(null);
                      // Staff meals are written by hand only.
                      if (a === "staff") chooseManual(true);
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition",
                      on ? "border-amber bg-amber/10" : "border-border bg-card hover:border-amber/50",
                    )}
                  >
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", on ? "bg-amber text-forest" : "bg-secondary text-moss")}>
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-semibold">{t(a === "staff" ? "audience.staff" : "audience.guests")}</span>
                      <span className="block text-sm text-muted-foreground">{t(a === "staff" ? "audience.staffHint" : "audience.guestsHint")}</span>
                    </span>
                    {on && <Check className="size-5 text-amber-deep" />}
                  </button>
                );
              })}
              {!picking && (
                <Button type="button" variant="outline" className="h-12 text-base" onClick={() => setPicking(true)}>
                  <ArrowLeftRight /> {t("audience.change")}
                </Button>
              )}
            </div>
          </div>
          {audience !== "staff" && (
            <Field label={t("supply.title")} htmlFor="title" error={errors.title} className="sm:col-span-2">
              <Input id="title" placeholder={t("supply.titlePh")} value={title} aria-invalid={!!errors.title} className="h-12 text-base"
                onChange={(e) => setTitle(e.target.value)} />
            </Field>
          )}
          <Field label={t("supply.orderDate")} htmlFor="date" error={errors.eventDate}
            className={cn(audience === "staff" && "sm:col-span-2")}>
            <Input id="date" type="date" value={eventDate} aria-invalid={!!errors.eventDate} className="h-12 text-base"
              onChange={(e) => setEventDate(e.target.value)} />
          </Field>
          <Field label={t("supply.days")} htmlFor="days" error={errors.days}>
            <Input id="days" type="number" inputMode="numeric" min={1} value={days || ""} aria-invalid={!!errors.days}
              className="h-12 text-lg" onFocus={selectAll}
              onChange={(e) => {
                const v = Math.max(0, parseInt(e.target.value) || 0);
                setDays(v);
                recalcIfUntouched(guestCount, v);
              }} />
          </Field>
          {audience !== "staff" && (
            <Field label={t("supply.meal")}>
              <Select value={meal} onValueChange={setMeal}>
                <SelectTrigger className="h-12! w-full text-base"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEALS.map((m) => <SelectItem key={m} value={m}>{t(`meal.${m}` as TKey)}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label={t(audience === "staff" ? "supply.staffCount" : "supply.guests")} htmlFor="guests" error={errors.guestCount}>
            <Input id="guests" type="number" inputMode="numeric" min={1} value={guestCount || ""}
              aria-invalid={!!errors.guestCount} className="h-12 text-lg" onFocus={selectAll}
              onChange={(e) => {
                const v = Math.max(0, parseInt(e.target.value) || 0);
                setGuestCount(v);
                recalcIfUntouched(v, days);
              }} />
          </Field>
        </CardContent>
      </Card>

      {/* 2. dishes */}
      <Card>
        <CardHeader className="gap-4">
          <StepTitle
            n={2}
            title={t(audience === "staff" ? "supply.ownDishes" : "supply.mode")}
            extra={!manual && dishes.length > 0 && (
              <span className="text-sm text-muted-foreground">{t("supply.selected", { n: dishes.length })}</span>
            )}
          />
          {audience !== "staff" && (
          <div role="radiogroup" aria-label={t("supply.mode")} className="grid gap-2 sm:grid-cols-2">
            {([false, true] as const).map((m) => {
              const on = manual === m;
              const Icon = m ? PenLine : Calculator;
              return (
                <button key={String(m)} type="button" role="radio" aria-checked={on} onClick={() => chooseManual(m)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition",
                    on ? "border-amber bg-amber/10" : "border-border bg-card hover:border-amber/50",
                  )}>
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", on ? "bg-amber text-forest" : "bg-secondary text-moss")}>
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-semibold">{t(m ? "supply.modeManual" : "supply.modeCalc")}</span>
                    <span className="block text-sm text-muted-foreground">{t(m ? "supply.modeManualHint" : "supply.modeCalcHint")}</span>
                  </span>
                  {on && <Check className="size-5 text-amber-deep" />}
                </button>
              );
            })}
          </div>
          )}
          {manual ? (
            <>
              <p className="flex gap-2 rounded-xl bg-secondary/60 p-3 text-sm text-muted-foreground">
                <PenLine className="mt-0.5 size-4 shrink-0" /> {t("supply.manualHelp")}
              </p>
              <div className="grid gap-2">
                <label htmlFor="own-dish" className={cn("text-sm font-medium", audience === "staff" && "sr-only")}>{t("supply.ownDishes")}</label>
                <div className="flex gap-2">
                  <Input id="own-dish" placeholder={t("supply.ownDishPh")} value={dishInput} className="h-12 text-base"
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
            </>
          ) : (
            <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-12 pl-10 text-base" placeholder={t("supply.searchDish")} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          )}
        </CardHeader>
        {!manual && (
        <CardContent className="grid gap-4">
          {dishes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {dishes.map((d) => (
                <button type="button" key={d.id} onClick={() => toggleDish(d.id, d.name)}
                  className="inline-flex items-center gap-1 rounded-full bg-forest py-1.5 pr-2 pl-3 text-sm text-cream">
                  {d.name} <X className="size-4" />
                </button>
              ))}
            </div>
          )}
          {!recipes.data ? (
            <Skeleton className="h-40" />
          ) : grouped.length === 0 && !search ? (
            <EmptyState text={t("recipes.empty")} action={<Button asChild variant="outline"><Link href="/recipes">{t("nav.recipes")}</Link></Button>} />
          ) : (
            <div className="grid max-h-96 gap-5 overflow-y-auto rounded-lg border bg-muted/40 p-3">
              {grouped.map(([cat, list]) => (
                <div key={cat}>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">{cat}</p>
                  <div className="flex flex-wrap gap-2">
                    {list.map((r) => {
                      const on = selected.has(r.id);
                      return (
                        <button type="button" key={r.id} onClick={() => toggleDish(r.id, r.name)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-left text-base transition",
                            on ? "border-amber bg-amber font-semibold text-forest" : "border-border bg-card hover:border-amber/60",
                          )}>
                          {on && <Check className="size-4" />}
                          {r.name}
                          {!r.ingredients?.length && <span className="text-xs opacity-70">({t("supply.noRecipe")})</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => setAddingDish(true)}>
              <UtensilsCrossed /> {t("supply.newDish")}
            </Button>
          </div>
          <div>
            <Button type="button" variant="outline" className="h-11" disabled={!dishes.length || guestCount < 1 || days < 1}
              onClick={onCalculateClick}>
              <Calculator />
              {t("supply.recalc")} ({t("supply.calcFor", { n: guestCount, d: days })})
            </Button>
          </div>
          {noRecipe && noRecipe.length > 0 && (
            <div role="alert" className="flex gap-3 rounded-xl border border-amber/60 bg-amber/10 p-3 text-sm">
              <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-deep" />
              <div className="grid gap-2">
                <p className="font-medium">
                  {t(noRecipe.length === dishes.length ? "supply.noRecipeAll" : "supply.noRecipeSome")}
                </p>
                <p className="text-muted-foreground">{noRecipe.join(" · ")}</p>
                <p className="text-muted-foreground">{t("supply.noRecipeHelp")}</p>
                <div>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/recipes" target="_blank" rel="noopener">
                      <BookOpen /> {t("supply.addRecipes")}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        )}
      </Card>

      {/* 3. items */}
      <Card>
        <CardHeader>
          <StepTitle n={3} title={t(manual ? "supply.step3Manual" : "supply.step3")}
            extra={items.length > 0 && <span className="text-sm text-muted-foreground">{t("supply.totalItems", { n: items.length })}</span>} />
        </CardHeader>
        <CardContent className="grid gap-3">
          {items.length === 0 ? (
            <EmptyState text={t(manual ? "supply.noItemsManual" : "supply.noItems")} icon={manual ? PenLine : Calculator} />
          ) : (
            <>
              <div className="hidden grid-cols-12 gap-2 px-2 text-sm text-muted-foreground sm:grid">
                <span className="col-span-4">{t("supply.item")}</span>
                <span className="col-span-2">{t("supply.qty")}</span>
                <span className="col-span-2">{t("supply.unit")}</span>
                <span className="col-span-3">{t("supply.note")}</span>
              </div>
              {items.map((it, i) => {
                const changed = it.calculated != null && Number(it.qty) !== it.calculated;
                return (
                  <div key={i} className={cn("grid grid-cols-12 items-start gap-2 rounded-lg border p-2", changed ? "border-amber/50 bg-amber/10" : "bg-muted/30")}>
                    <Field error={errors[`items.${i}.name`]} className="col-span-12 sm:col-span-4">
                      <Input placeholder={t("supply.item")} value={it.name} aria-invalid={!!errors[`items.${i}.name`]}
                        className="h-11 bg-card text-base" onChange={(e) => update(i, { name: e.target.value })} />
                    </Field>
                    <Field error={errors[`items.${i}.qty`]} className="col-span-5 sm:col-span-2">
                      <Input type="number" step="any" min={0} inputMode="decimal" placeholder={t("supply.qty")} className="h-11 bg-card text-base" onFocus={selectAll}
                        value={it.qty || ""} aria-invalid={!!errors[`items.${i}.qty`]}
                        onChange={(e) => update(i, { qty: e.target.value === "" ? 0 : Number(e.target.value) })} />
                    </Field>
                    <div className="col-span-5 sm:col-span-2">
                      <UnitSelect value={it.unit} onChange={(unit) => update(i, { unit })} className="h-11! text-base" />
                    </div>
                    <Button type="button" variant="ghost" size="icon-lg" className="col-span-2 justify-self-end text-destructive hover:text-destructive sm:order-last sm:col-span-1"
                      aria-label={t("remove")} onClick={() => setItems((cur) => cur.filter((_, j) => j !== i))}>
                      <Trash2 />
                    </Button>
                    <Input className="col-span-12 h-11 bg-card text-base sm:col-span-3" placeholder={t("supply.note")} value={it.note}
                      onChange={(e) => update(i, { note: e.target.value })} />
                    {it.calculated != null && (
                      <p className="order-last col-span-12 px-1 text-xs text-muted-foreground">
                        {t("supply.calc")}: {qty(it.calculated, it.unit)}
                        {changed && <span className="ml-2 font-medium text-amber-deep">• {t("supply.changed")}</span>}
                      </p>
                    )}
                  </div>
                );
              })}
            </>
          )}
          {errors.items && <p className="text-sm text-destructive">{t(errors.items as TKey)}</p>}
          <div>
            <Button type="button" variant="outline" className="h-11"
              onClick={() => setItems((cur) => [...cur, { name: "", qty: 0, unit: "kg", note: "", calculated: null }])}>
              <Plus /> {t("supply.addItem")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4">
          <Field label={t("supply.chefNote")} htmlFor="chef-note">
            <Textarea id="chef-note" rows={3} value={note} className="text-base" onChange={(e) => setNote(e.target.value)} />
          </Field>
          {hasErrors && (
            <p role="alert" className="rounded-lg bg-destructive/10 p-3 font-medium text-destructive">{errors.form || t("v.fix")}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="accent" className="h-14 flex-1 text-lg sm:flex-none sm:px-10" disabled={busy}>
              <Send className="size-5" /> {busy ? t("saving") : submitLabel}
            </Button>
            {onCancel && <Button type="button" variant="outline" className="h-14 text-base" onClick={() => { draft.clear(); onCancel(); }}>{t("cancel")}</Button>}
          </div>
        </CardContent>
      </Card>

      <Dialog open={addingDish} onOpenChange={setAddingDish}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {addingDish && (
            <RecipeEditor
              ingredientsOptional
              recipe={{ id: "", name: search.trim(), menu: audience, category: (audience === "staff" ? STAFF_CATEGORIES : CATEGORIES)[0], ingredients: [] }}
              onDone={(saved) => {
                setAddingDish(false);
                if (saved) {
                  setSearch("");
                  if (!selected.has(saved.id)) setDishList([...dishes, { id: saved.id, name: saved.name }]);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

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
