"use client";

import Link from "next/link";
import { Calculator, Check, Plus, Search, Send, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { calculateItems, round } from "@/lib/calc";
import { today } from "@/lib/format";
import { useRecipes } from "@/lib/hooks";
import { useI18n, type TKey } from "@/lib/i18n";
import { fieldErrors, supplySchema } from "@/lib/schemas";
import { UNITS, type DishRef, type Recipe, type SupplyItem, type SupplyList, type Unit } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmptyState, Field, StepTitle } from "./common";

export const MEALS = ["breakfast", "lunch", "dinner", "hightea", "bbq", "other"] as const;

export type SupplyFormData = Pick<SupplyList, "title" | "eventDate" | "meal" | "guestCount" | "dishes" | "items">;

export function UnitSelect({ value, onChange, className }: { value: Unit; onChange: (u: Unit) => void; className?: string }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Unit)}>
      <SelectTrigger className={cn("w-full bg-card", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {UNITS.map((u) => (
          <SelectItem key={u} value={u}>{u}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SupplyForm({
  initial, submitLabel, onSubmit, onCancel,
}: {
  initial?: SupplyFormData;
  submitLabel: string;
  onSubmit: (data: SupplyFormData, note: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const { t } = useI18n();
  const recipes = useRecipes();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [eventDate, setEventDate] = useState(initial?.eventDate ?? today());
  const [meal, setMeal] = useState(initial?.meal ?? "lunch");
  const [guestCount, setGuestCount] = useState<number>(initial?.guestCount ?? 10);
  const [dishes, setDishes] = useState<DishRef[]>(initial?.dishes ?? []);
  const [items, setItems] = useState<SupplyItem[]>(initial?.items ?? []);
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmRecalc, setConfirmRecalc] = useState(false);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, Recipe[]>();
    for (const r of recipes.data ?? []) {
      if (q && !r.name.toLowerCase().includes(q)) continue;
      map.set(r.category, [...(map.get(r.category) ?? []), r]);
    }
    return [...map.entries()];
  }, [recipes.data, search]);

  const selected = new Set(dishes.map((d) => d.id));
  const toggleDish = (id: string, name: string) =>
    setDishes((cur) => (selected.has(id) ? cur.filter((d) => d.id !== id) : [...cur, { id, name }]));

  function calculate() {
    const chosen = (recipes.data ?? []).filter((r) => selected.has(r.id));
    setItems(calculateItems(chosen, guestCount));
    setErrors((e) => ({ ...e, items: "" }));
  }

  const update = (i: number, patch: Partial<SupplyItem>) =>
    setItems((cur) => cur.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = supplySchema.safeParse({
      title,
      eventDate,
      meal,
      guestCount,
      dishes,
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
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "error" });
      setBusy(false);
    }
  }

  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <form onSubmit={submit} className="grid gap-6" noValidate>
      {/* 1. booking */}
      <Card>
        <CardHeader>
          <StepTitle n={1} title={t("supply.step1")} />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t("supply.title")} htmlFor="title" error={errors.title} className="sm:col-span-2">
            <Input id="title" placeholder={t("supply.titlePh")} value={title} aria-invalid={!!errors.title}
              onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label={t("supply.date")} htmlFor="date" error={errors.eventDate}>
            <Input id="date" type="date" value={eventDate} aria-invalid={!!errors.eventDate}
              onChange={(e) => setEventDate(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("supply.meal")}>
              <Select value={meal} onValueChange={setMeal}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEALS.map((m) => <SelectItem key={m} value={m}>{t(`meal.${m}` as TKey)}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("supply.guests")} htmlFor="guests" error={errors.guestCount}>
              <Input id="guests" type="number" inputMode="numeric" min={1} value={guestCount || ""}
                aria-invalid={!!errors.guestCount}
                onChange={(e) => setGuestCount(Math.max(0, parseInt(e.target.value) || 0))} />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* 2. dishes */}
      <Card>
        <CardHeader className="gap-4">
          <StepTitle
            n={2}
            title={t("supply.step2")}
            extra={dishes.length > 0 && (
              <span className="text-sm text-muted-foreground">{t("supply.selected", { n: dishes.length })}</span>
            )}
          />
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder={t("supply.searchDish")} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {dishes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {dishes.map((d) => (
                <button type="button" key={d.id} onClick={() => toggleDish(d.id, d.name)}
                  className="inline-flex items-center gap-1 rounded-full bg-forest py-1 pr-2 pl-3 text-xs text-cream">
                  {d.name} <X className="size-3.5" />
                </button>
              ))}
            </div>
          )}
          {!recipes.data ? (
            <Skeleton className="h-40" />
          ) : recipes.data.length === 0 ? (
            <EmptyState text={t("recipes.empty")} action={<Button asChild variant="outline"><Link href="/recipes">{t("nav.recipes")}</Link></Button>} />
          ) : (
            <div className="grid max-h-96 gap-5 overflow-y-auto rounded-lg border bg-muted/40 p-3">
              {grouped.map(([cat, list]) => (
                <div key={cat}>
                  <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{cat}</p>
                  <div className="flex flex-wrap gap-2">
                    {list.map((r) => {
                      const on = selected.has(r.id);
                      return (
                        <button type="button" key={r.id} onClick={() => toggleDish(r.id, r.name)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-left text-sm transition",
                            on ? "border-amber bg-amber/20 font-medium" : "border-border bg-card hover:border-amber/60",
                          )}>
                          {on && <Check className="size-3.5 text-amber-deep" />}
                          {r.name}
                          {!r.ingredients?.length && <span className="text-[10px] text-muted-foreground">({t("supply.noRecipe")})</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div>
            <Button type="button" disabled={!dishes.length || guestCount < 1}
              onClick={() => (items.length ? setConfirmRecalc(true) : calculate())}>
              <Calculator />
              {t("supply.calculate")} ({guestCount} × {dishes.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. items */}
      <Card>
        <CardHeader>
          <StepTitle n={3} title={t("supply.step3")}
            extra={items.length > 0 && <span className="text-sm text-muted-foreground">{t("supply.totalItems", { n: items.length })}</span>} />
        </CardHeader>
        <CardContent className="grid gap-3">
          {items.length === 0 ? (
            <EmptyState text={t("supply.noItems")} icon={Calculator} />
          ) : (
            <>
              <div className="hidden grid-cols-12 gap-2 px-2 text-xs tracking-wide text-muted-foreground uppercase sm:grid">
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
                        className="bg-card" onChange={(e) => update(i, { name: e.target.value })} />
                    </Field>
                    <Field error={errors[`items.${i}.qty`]} className="col-span-5 sm:col-span-2">
                      <Input type="number" step="any" min={0} inputMode="decimal" placeholder={t("supply.qty")} className="bg-card"
                        value={it.qty || ""} aria-invalid={!!errors[`items.${i}.qty`]}
                        onChange={(e) => update(i, { qty: e.target.value === "" ? 0 : Number(e.target.value) })} />
                    </Field>
                    <div className="col-span-5 sm:col-span-2">
                      <UnitSelect value={it.unit} onChange={(unit) => update(i, { unit })} />
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="col-span-2 justify-self-end text-destructive hover:text-destructive sm:order-last sm:col-span-1"
                      aria-label={t("remove")} onClick={() => setItems((cur) => cur.filter((_, j) => j !== i))}>
                      <Trash2 />
                    </Button>
                    <Input className="col-span-12 bg-card sm:col-span-3" placeholder={t("supply.note")} value={it.note}
                      onChange={(e) => update(i, { note: e.target.value })} />
                    {it.calculated != null && (
                      <p className="col-span-12 px-1 text-[11px] text-muted-foreground">
                        {t("supply.calc")}: {it.calculated} {it.unit}
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
            <Button type="button" variant="outline"
              onClick={() => setItems((cur) => [...cur, { name: "", qty: 0, unit: "kg", note: "", calculated: null }])}>
              <Plus /> {t("supply.addItem")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4">
          <Field label={t("supply.chefNote")} htmlFor="chef-note">
            <Textarea id="chef-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          {hasErrors && (
            <p className="text-sm text-destructive">{errors.form && errors.form !== "error" ? errors.form : t("v.fix")}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="accent" size="lg" disabled={busy}>
              <Send /> {busy ? t("saving") : submitLabel}
            </Button>
            {onCancel && <Button type="button" variant="outline" size="lg" onClick={onCancel}>{t("cancel")}</Button>}
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
