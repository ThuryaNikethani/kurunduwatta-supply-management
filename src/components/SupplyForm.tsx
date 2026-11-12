"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft, ArrowRight, BookOpen, Calculator, Check, Clock3, Coffee, Flame, HardHat, MessageSquare, Minus, Moon, PenLine,
  Plus, RefreshCw, Search, Send, Sun, Sunrise, Trash2, TriangleAlert, Users, UtensilsCrossed, X,
} from "lucide-react";
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { calculateItems, round } from "@/lib/calc";
import { formatDate, qty, today, unitLabel } from "@/lib/format";
import { useRecipes } from "@/lib/hooks";
import { errorText, useI18n, type TKey } from "@/lib/i18n";
import { fieldErrors, supplySchema } from "@/lib/schemas";
import { AUDIENCES, UNITS, type Audience, type DishRef, type Recipe, type SupplyItem, type SupplyList, type Unit } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmptyState, Field } from "./common";
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
const MEAL_ICON: Record<(typeof MEALS)[number], LucideIcon> = {
  breakfast: Sunrise, lunch: Sun, dinner: Moon, hightea: Coffee, bbq: Flame, allday: Clock3,
};

/** One question per screen: who → how many → food → items. */
const STEPS = ["wiz.who", "wiz.count", "wiz.food", "wiz.items"] as const;
const LAST = STEPS.length - 1;
/** Fields asked on the "how many" screen, to jump back there when one is wrong. */
const COUNT_FIELDS = ["title", "eventDate", "meal", "guestCount", "days"];

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

/** Big − number + control, so numbers rarely need typing. */
function Counter({ id, label, value, onChange, error }: {
  id: string; label: string; value: number; onChange: (v: number) => void; error?: string;
}) {
  const { t } = useI18n();
  return (
    <Field label={label} htmlFor={id} error={error}>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" className="size-14 rounded-2xl" aria-label={t("wiz.less")}
          disabled={value <= 1} onClick={() => onChange(Math.max(1, value - 1))}>
          <Minus className="size-6" />
        </Button>
        <Input id={id} type="number" inputMode="numeric" min={1} value={value || ""} aria-invalid={!!error}
          className="h-14 flex-1 text-center text-2xl font-semibold"
          onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))} />
        <Button type="button" variant="outline" className="size-14 rounded-2xl" aria-label={t("wiz.more")}
          onClick={() => onChange(value + 1)}>
          <Plus className="size-6" />
        </Button>
      </div>
    </Field>
  );
}

/** A large tap-to-choose card with an icon. */
function BigChoice({ on, Icon, title, hint, onClick }: {
  on: boolean; Icon: LucideIcon; title: string; hint?: string; onClick: () => void;
}) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick}
      className={cn(
        "flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition",
        on ? "border-amber bg-amber/10" : "border-border bg-card hover:border-amber/50",
      )}>
      <span className={cn("flex size-14 shrink-0 items-center justify-center rounded-full", on ? "bg-amber text-forest" : "bg-secondary text-moss")}>
        <Icon className="size-7" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold">{title}</span>
        {hint && <span className="block text-sm text-muted-foreground">{hint}</span>}
      </span>
      {on && <Check className="size-6 text-amber-deep" />}
    </button>
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
  /** Which screen is showing; a saved list opens straight on its items. */
  const [step, setStep] = useState(initial ? LAST : 0);
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
  const [showNote, setShowNote] = useState(false);
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
      setStep(LAST);
      setTitle(d.title);
      setEventDate(d.eventDate);
      setMeal(d.meal);
      setGuestCount(d.guestCount);
      setDays(d.days ?? 1);
      setDishes(d.dishes);
      setItems(d.items);
      setNote(d.note);
      setShowNote(!!d.note);
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
  const toggleDish = (id: string, name: string) =>
    setDishes((cur) => (selected.has(id) ? cur.filter((d) => d.id !== id) : [...cur, { id, name }]));

  /** The last calculated list, to tell if the chef has changed it since. */
  const lastCalc = useRef("");

  /** Amounts for every person for every day: per person × people × days. */
  function calcFor(people: number, numDays: number) {
    const ready = (recipes.data ?? []).filter((r) => selected.has(r.id) && r.ingredients?.length);
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

  function pickAudience(a: Audience) {
    if (a !== audience) {
      setAudience(a);
      const menuOf = new Map((recipes.data ?? []).map((r) => [r.id, r.menu ?? "guests"]));
      setDishes((cur) => cur.filter((d) => (menuOf.get(d.id) ?? a) === a));
      setNoRecipe(null);
      // Staff meals are written by hand only.
      if (a === "staff") chooseManual(true);
    }
    setStep(1);
  }

  function addOwnDish() {
    const name = dishInput.trim();
    if (!name) return;
    setOwnDishes((cur) => (cur.includes(name) ? cur : [...cur, name]));
    setDishInput("");
  }

  const update = (i: number, patch: Partial<SupplyItem>) =>
    setItems((cur) => cur.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  const setPeople = (v: number) => { setGuestCount(v); recalcIfUntouched(v, days); };
  const setNumDays = (v: number) => { setDays(v); recalcIfUntouched(guestCount, v); };

  /** Check the screen before moving on; the last screen sends the list. */
  function goNext() {
    if (step === 1) {
      const e: Record<string, string> = {};
      if (!eventDate) e.eventDate = "v.required";
      if (guestCount < 1) e.guestCount = "v.guests";
      if (days < 1) e.days = "v.days";
      setErrors(e);
      if (Object.keys(e).length) return;
    }
    if (step === 2 && !manual) {
      if (!dishes.length) return setErrors({ dishes: "wiz.pickDish" });
      // Work the amounts out on the way to the list, unless the chef has changed them.
      if (!items.length || JSON.stringify(items) === lastCalc.current) calculate();
      else {
        const chosen = (recipes.data ?? []).filter((r) => selected.has(r.id));
        setNoRecipe(chosen.filter((r) => !r.ingredients?.length).map((r) => r.name));
      }
    }
    setErrors({});
    setStep((s) => Math.min(LAST, s + 1));
    window.scrollTo({ top: 0 });
  }

  function goBack() {
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0 });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Enter on an earlier screen means "next", not "send".
    if (step < LAST) return goNext();
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
      const errs = fieldErrors(parsed.error);
      setErrors(errs);
      if (COUNT_FIELDS.some((f) => errs[f])) setStep(1);
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

  /** What was chosen so far, shown on the list screen; tap to go back and change. */
  const summary: { text: string; to: number }[] = [
    { text: t(isStaff ? "audience.staff" : "audience.guests"), to: 0 },
    { text: t("supply.calcFor", { n: guestCount, d: days }), to: 1 },
    ...(isStaff ? [] : [{ text: t(`meal.${meal}` as TKey), to: 1 }]),
    { text: formatDate(eventDate), to: 1 },
  ];

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <DraftNotice restoredAt={draft.restoredAt} onDiscard={draft.discard} />

      {/* progress */}
      <div className="grid gap-3">
        <div className="flex gap-1.5" aria-hidden>
          {STEPS.map((k, i) => (
            <span key={k} className={cn("h-2 flex-1 rounded-full", i <= step ? "bg-amber" : "bg-secondary")} />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{t("wiz.step", { n: step + 1, total: STEPS.length })}</p>
        <h2 className="font-display text-3xl font-semibold">{t(STEPS[step])}</h2>
      </div>

      <Card>
        <CardContent className="grid gap-5">
          {/* 1. who */}
          {step === 0 && (
            <div role="radiogroup" aria-label={t("wiz.who")} className="grid gap-3 sm:grid-cols-2">
              {AUDIENCES.map((a) => (
                <BigChoice key={a} on={audience === a} Icon={a === "staff" ? HardHat : Users}
                  title={t(a === "staff" ? "audience.staff" : "audience.guests")}
                  hint={t(a === "staff" ? "audience.staffHint" : "audience.guestsHint")}
                  onClick={() => pickAudience(a)} />
              ))}
            </div>
          )}

          {/* 2. how many */}
          {step === 1 && (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <Counter id="guests" label={t(isStaff ? "supply.staffCount" : "supply.guests")} value={guestCount}
                  onChange={setPeople} error={errors.guestCount} />
                <Counter id="days" label={t("supply.days")} value={days} onChange={setNumDays} error={errors.days} />
              </div>
              {!isStaff && (
                <div className="grid gap-2">
                  <p className="text-xs tracking-wide text-muted-foreground uppercase">{t("supply.meal")}</p>
                  <div role="radiogroup" aria-label={t("supply.meal")} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {MEALS.map((m) => {
                      const on = meal === m;
                      const Icon = MEAL_ICON[m];
                      return (
                        <button key={m} type="button" role="radio" aria-checked={on} onClick={() => setMeal(m)}
                          className={cn(
                            "flex items-center gap-2 rounded-xl border-2 px-3 py-3 text-left font-medium transition",
                            on ? "border-amber bg-amber/10" : "border-border bg-card hover:border-amber/50",
                          )}>
                          <Icon className={cn("size-5 shrink-0", on ? "text-amber-deep" : "text-moss")} />
                          {t(`meal.${m}` as TKey)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t("supply.orderDate")} htmlFor="date" error={errors.eventDate}>
                  <Input id="date" type="date" value={eventDate} aria-invalid={!!errors.eventDate} className="h-12"
                    onChange={(e) => setEventDate(e.target.value)} />
                </Field>
                {!isStaff && (
                  <Field label={`${t("supply.title")} ${t("wiz.optional")}`} htmlFor="title" error={errors.title}>
                    <Input id="title" placeholder={t("supply.titlePh")} value={title} aria-invalid={!!errors.title} className="h-12"
                      onChange={(e) => setTitle(e.target.value)} />
                  </Field>
                )}
              </div>
            </>
          )}

          {/* 3. food */}
          {step === 2 && (
            <>
              {!isStaff && (
                <div role="radiogroup" aria-label={t("supply.mode")} className="grid gap-3 sm:grid-cols-2">
                  {([false, true] as const).map((m) => (
                    <BigChoice key={String(m)} on={manual === m} Icon={m ? PenLine : Calculator}
                      title={t(m ? "supply.modeManual" : "supply.modeCalc")}
                      hint={t(m ? "supply.modeManualHint" : "supply.modeCalcHint")}
                      onClick={() => chooseManual(m)} />
                  ))}
                </div>
              )}
              {manual ? (
                <div className="grid gap-3">
                  <p className="flex gap-2 rounded-xl bg-secondary/60 p-3 text-sm text-muted-foreground">
                    <PenLine className="mt-0.5 size-4 shrink-0" /> {t("supply.manualHelp")}
                  </p>
                  <label htmlFor="own-dish" className="text-xs tracking-wide text-muted-foreground uppercase">{t("supply.ownDishes")}</label>
                  <div className="flex gap-2">
                    <Input id="own-dish" placeholder={t("supply.ownDishPh")} value={dishInput} className="h-12"
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
                <div className="grid gap-4">
                  {dishes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{t("supply.selected", { n: dishes.length })}:</span>
                      {dishes.map((d) => (
                        <button type="button" key={d.id} onClick={() => toggleDish(d.id, d.name)} aria-label={`${t("remove")}: ${d.name}`}
                          className="inline-flex items-center gap-1 rounded-full bg-forest py-1.5 pr-2 pl-3 text-sm text-cream">
                          {d.name} <X className="size-4" />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
                    <Input className="h-12 pl-10" placeholder={t("supply.searchDish")} value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  {!recipes.data ? (
                    <Skeleton className="h-40" />
                  ) : grouped.length === 0 && !search ? (
                    <EmptyState text={t("recipes.empty")} action={<Button asChild variant="outline"><Link href="/recipes">{t("nav.recipes")}</Link></Button>} />
                  ) : (
                    <div className="grid max-h-96 gap-5 overflow-y-auto rounded-xl border bg-muted/40 p-3">
                      {grouped.map(([cat, list]) => (
                        <div key={cat}>
                          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{cat}</p>
                          <div className="flex flex-wrap gap-2">
                            {list.map((r) => {
                              const on = selected.has(r.id);
                              return (
                                <button type="button" key={r.id} onClick={() => toggleDish(r.id, r.name)} aria-pressed={on}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-left transition",
                                    on ? "border-amber bg-amber/20 font-medium" : "border-border bg-card hover:border-amber/60",
                                  )}>
                                  {on && <Check className="size-4 text-amber-deep" />}
                                  {r.name}
                                  {!r.ingredients?.length && <span className="text-[11px] text-muted-foreground">({t("supply.noRecipe")})</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {errors.dishes && <p role="alert" className="text-sm text-destructive">{t(errors.dishes as TKey)}</p>}
                  <div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setAddingDish(true)}>
                      <UtensilsCrossed /> {t("supply.newDish")}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 4. items */}
          {step === 3 && (
            <>
              <div className="flex flex-wrap gap-2">
                {summary.map((s, i) => (
                  <button key={i} type="button" onClick={() => setStep(s.to)}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-secondary/60 px-3 py-1 text-sm hover:border-amber/60">
                    {s.text} <PenLine className="size-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>

              {!manual && noRecipe && noRecipe.length > 0 && (
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

              {items.length === 0 ? (
                <EmptyState text={t(manual ? "supply.noItemsManual" : "supply.noItems")} icon={manual ? PenLine : Calculator} />
              ) : (
                <div className="grid gap-3">
                  <p className="text-sm text-muted-foreground">{t("supply.totalItems", { n: items.length })}</p>
                  {items.map((it, i) => {
                    const changed = it.calculated != null && Number(it.qty) !== it.calculated;
                    return (
                      <div key={i} className={cn("grid grid-cols-12 items-start gap-2 rounded-xl border p-2", changed ? "border-amber/50 bg-amber/10" : "bg-muted/30")}>
                        <Field error={errors[`items.${i}.name`]} className="col-span-12 sm:col-span-4">
                          <Input placeholder={t("supply.item")} value={it.name} aria-invalid={!!errors[`items.${i}.name`]}
                            className="h-11 bg-card" onChange={(e) => update(i, { name: e.target.value })} />
                        </Field>
                        <Field error={errors[`items.${i}.qty`]} className="col-span-5 sm:col-span-2">
                          <Input type="number" step="any" min={0} inputMode="decimal" placeholder={t("supply.qty")} className="h-11 bg-card"
                            value={it.qty || ""} aria-invalid={!!errors[`items.${i}.qty`]}
                            onChange={(e) => update(i, { qty: e.target.value === "" ? 0 : Number(e.target.value) })} />
                        </Field>
                        <div className="col-span-5 sm:col-span-2">
                          <UnitSelect value={it.unit} onChange={(unit) => update(i, { unit })} className="h-11" />
                        </div>
                        <Button type="button" variant="ghost" size="icon-lg" className="col-span-2 justify-self-end text-destructive hover:text-destructive sm:order-last sm:col-span-1"
                          aria-label={t("remove")} onClick={() => setItems((cur) => cur.filter((_, j) => j !== i))}>
                          <Trash2 />
                        </Button>
                        <Input className="col-span-12 h-11 bg-card sm:col-span-3" placeholder={t("supply.note")} value={it.note}
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
                </div>
              )}
              {errors.items && <p className="text-sm text-destructive">{t(errors.items as TKey)}</p>}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="lg"
                  onClick={() => setItems((cur) => [...cur, { name: "", qty: 0, unit: "kg", note: "", calculated: null }])}>
                  <Plus /> {t("supply.addItem")}
                </Button>
                {!manual && dishes.length > 0 && (
                  <Button type="button" variant="ghost" size="lg" onClick={onCalculateClick}>
                    <RefreshCw /> {t("wiz.recalc")}
                  </Button>
                )}
              </div>

              {showNote ? (
                <Field label={t("supply.chefNote")} htmlFor="chef-note">
                  <Textarea id="chef-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} autoFocus={!note} />
                </Field>
              ) : (
                <div>
                  <Button type="button" variant="ghost" onClick={() => setShowNote(true)}>
                    <MessageSquare /> {t("wiz.addNote")}
                  </Button>
                </div>
              )}
            </>
          )}

          {hasErrors && step === LAST && (
            <p className="text-sm text-destructive">{errors.form || t("v.fix")}</p>
          )}
        </CardContent>
      </Card>

      {/* back / next */}
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        {step > 0 && (
          <Button type="button" variant="outline" className="h-12 px-5 text-base" onClick={goBack}>
            <ArrowLeft /> {t("wiz.back")}
          </Button>
        )}
        {onCancel && (
          <Button type="button" variant="ghost" className="h-12 text-base" onClick={() => { draft.clear(); onCancel(); }}>
            {t("cancel")}
          </Button>
        )}
        {step > 0 && step < LAST && (
          <Button type="button" variant="accent" className="ml-auto h-12 px-6 text-base" onClick={goNext}>
            {t("wiz.next")} <ArrowRight />
          </Button>
        )}
        {step === LAST && (
          <Button type="submit" variant="accent" className="ml-auto h-12 px-6 text-base" disabled={busy}>
            <Send /> {busy ? t("saving") : submitLabel}
          </Button>
        )}
      </div>

      <Dialog open={addingDish} onOpenChange={setAddingDish}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {addingDish && (
            <RecipeEditor
              ingredientsOptional
              recipe={{ id: "", name: search.trim(), menu: audience, category: (isStaff ? STAFF_CATEGORIES : CATEGORIES)[0], ingredients: [] }}
              onDone={(saved) => {
                setAddingDish(false);
                if (saved) {
                  setSearch("");
                  setDishes((cur) => (cur.some((d) => d.id === saved.id) ? cur : [...cur, { id: saved.id, name: saved.name }]));
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
