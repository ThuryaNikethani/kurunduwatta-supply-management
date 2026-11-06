"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { calculateItems, round } from "@/lib/calc";
import { today } from "@/lib/format";
import { useRecipes } from "@/lib/hooks";
import { useI18n, type TKey } from "@/lib/i18n";
import { UNITS, type DishRef, type Recipe, type SupplyItem, type SupplyList, type Unit } from "@/lib/types";

export const MEALS = ["breakfast", "lunch", "dinner", "hightea", "bbq", "other"] as const;

export type SupplyFormData = Pick<SupplyList, "title" | "eventDate" | "meal" | "guestCount" | "dishes" | "items">;

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
  const [error, setError] = useState("");

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
    if (items.length && !confirm(t("supply.recalcWarn"))) return;
    const chosen = (recipes.data ?? []).filter((r) => selected.has(r.id));
    setItems(calculateItems(chosen, guestCount));
  }

  const update = (i: number, patch: Partial<SupplyItem>) =>
    setItems((cur) => cur.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = items
      .filter((it) => it.name.trim() && Number(it.qty) > 0)
      .map((it) => ({ ...it, name: it.name.trim(), qty: round(Number(it.qty)), note: it.note.trim(), calculated: it.calculated ?? null }));
    if (!title.trim() || !eventDate || guestCount < 1 || !clean.length) {
      setError(t("supply.missing"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSubmit({ title: title.trim(), eventDate, meal, guestCount, dishes, items: clean }, note);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="card grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="label">{t("supply.title")}</label>
          <input className="input" required placeholder={t("supply.titlePh")} value={title}
            onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">{t("supply.date")}</label>
          <input type="date" className="input" required value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t("supply.meal")}</label>
            <select className="input" value={meal} onChange={(e) => setMeal(e.target.value)}>
              {MEALS.map((m) => <option key={m} value={m}>{t(`meal.${m}` as TKey)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t("supply.guests")}</label>
            <input type="number" min={1} className="input" required value={guestCount}
              onChange={(e) => setGuestCount(Math.max(0, parseInt(e.target.value) || 0))} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="h2">{t("supply.dishes")}</h2>
          <input className="input sm:w-64" placeholder={t("supply.searchDish")} value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>
        {dishes.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {dishes.map((d) => (
              <button type="button" key={d.id} onClick={() => toggleDish(d.id, d.name)}
                className="rounded-full bg-forest px-3 py-1 text-xs text-cream">
                {d.name} ✕
              </button>
            ))}
          </div>
        )}
        {!recipes.data ? (
          <p className="text-sm text-muted">{t("loading")}</p>
        ) : recipes.data.length === 0 ? (
          <p className="text-sm text-muted">
            {t("recipes.empty")} <Link href="/recipes" className="underline">{t("nav.recipes")} →</Link>
          </p>
        ) : (
          <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
            {grouped.map(([cat, list]) => (
              <div key={cat}>
                <p className="mb-1.5 text-xs font-medium tracking-wide text-muted uppercase">{cat}</p>
                <div className="flex flex-wrap gap-2">
                  {list.map((r) => {
                    const on = selected.has(r.id);
                    const empty = !r.ingredients?.length;
                    return (
                      <button type="button" key={r.id} onClick={() => toggleDish(r.id, r.name)}
                        className={`rounded-full border px-3 py-1 text-left text-sm transition ${
                          on ? "border-amber bg-amber/20" : "border-mist bg-white hover:border-amber/60"
                        }`}>
                        {r.name}
                        {empty && <span className="ml-1 text-[10px] text-muted">({t("supply.noRecipe")})</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <button type="button" onClick={calculate} disabled={!dishes.length || guestCount < 1}
          className="btn-dark mt-4">
          {t("supply.calculate")} ({guestCount} × {dishes.length})
        </button>
      </div>

      <div className="card">
        <h2 className="h2 mb-3">{t("supply.items")}</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted">{t("supply.noItems")}</p>
        ) : (
          <div className="space-y-3">
            {items.map((it, i) => {
              const changed = it.calculated != null && Number(it.qty) !== it.calculated;
              return (
                <div key={i} className={`grid grid-cols-12 gap-2 rounded-xl p-2 ${changed ? "bg-amber/10" : "bg-cream/60"}`}>
                  <input className="input col-span-12 sm:col-span-4" placeholder={t("supply.item")} value={it.name}
                    onChange={(e) => update(i, { name: e.target.value })} />
                  <input type="number" step="any" min={0} className="input col-span-4 sm:col-span-2" placeholder={t("supply.qty")}
                    value={it.qty} onChange={(e) => update(i, { qty: e.target.value === "" ? 0 : Number(e.target.value) })} />
                  <select className="input col-span-4 sm:col-span-2" value={it.unit}
                    onChange={(e) => update(i, { unit: e.target.value as Unit })}>
                    {UNITS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                  <button type="button" className="col-span-4 text-xs text-danger sm:order-last sm:col-span-1"
                    onClick={() => setItems((cur) => cur.filter((_, j) => j !== i))}>
                    {t("remove")}
                  </button>
                  <input className="input col-span-12 sm:col-span-3" placeholder={t("supply.note")} value={it.note}
                    onChange={(e) => update(i, { note: e.target.value })} />
                  {it.calculated != null && (
                    <p className="col-span-12 px-1 text-[11px] text-muted">
                      {t("supply.calc")}: {it.calculated} {it.unit}
                      {changed && <span className="ml-2 font-medium text-amber-deep">• {t("supply.changed")}</span>}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <button type="button" className="btn-outline mt-4"
          onClick={() => setItems((cur) => [...cur, { name: "", qty: 0, unit: "kg", note: "", calculated: null }])}>
          + {t("supply.addItem")}
        </button>
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
