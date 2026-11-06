"use client";

import { useMemo, useState } from "react";
import { deleteDoc, doc, setDoc, writeBatch } from "firebase/firestore";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { useRecipes } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { CATEGORIES, MENU, slugify } from "@/lib/menu";
import { UNITS, type Ingredient, type Recipe, type Unit } from "@/lib/types";

export default function RecipesPage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const recipes = useRecipes();
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const canEdit = profile?.role === "chef" || profile?.role === "hr";

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, Recipe[]>();
    for (const r of recipes.data ?? []) {
      if (q && !r.name.toLowerCase().includes(q)) continue;
      map.set(r.category, [...(map.get(r.category) ?? []), r]);
    }
    return [...map.entries()];
  }, [recipes.data, search]);

  async function loadMenu() {
    setBusy(true);
    try {
      const existing = new Set((recipes.data ?? []).map((r) => r.id));
      const batch = writeBatch(db);
      for (const { category, dishes } of MENU)
        for (const name of dishes) {
          const id = slugify(name);
          if (!existing.has(id))
            batch.set(doc(db, "recipes", id), { name, category, ingredients: [], updatedAt: Date.now() });
        }
      await batch.commit();
      toast({ text: t("recipes.loaded"), tone: "success" });
    } catch (e) {
      toast({ text: e instanceof Error ? e.message : t("error"), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h1">{t("recipes.title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("recipes.intro")}</p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <button className="btn-outline" onClick={loadMenu} disabled={busy}>{t("recipes.load")}</button>
            <button className="btn-primary" onClick={() => setAdding(true)}>+ {t("recipes.addDish")}</button>
          </div>
        )}
      </div>

      <input className="input sm:max-w-sm" placeholder={t("supply.searchDish")} value={search}
        onChange={(e) => setSearch(e.target.value)} />

      {adding && (
        <RecipeEditor
          recipe={{ id: "", name: "", category: CATEGORIES[0], ingredients: [] }}
          onDone={() => setAdding(false)}
        />
      )}

      {!recipes.data ? (
        <p className="text-muted">{t("loading")}</p>
      ) : recipes.data.length === 0 ? (
        <p className="card text-sm text-muted">{t("recipes.empty")}</p>
      ) : (
        grouped.map(([cat, list]) => (
          <section key={cat}>
            <h2 className="h2 mb-2">{cat}</h2>
            <div className="space-y-2">
              {list.map((r) =>
                open === r.id && canEdit ? (
                  <RecipeEditor key={r.id} recipe={r} onDone={() => setOpen(null)} />
                ) : (
                  <button key={r.id} onClick={() => setOpen(r.id)}
                    className="card flex w-full items-center justify-between gap-3 py-3 text-left sm:py-3">
                    <div className="min-w-0">
                      <p className="font-medium">{r.name}</p>
                      {r.ingredients.length > 0 && (
                        <p className="truncate text-xs text-muted">
                          {r.ingredients.map((i) => `${i.name} ${i.qtyPerPerson}${i.unit}`).join(" · ")}
                        </p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ${
                      r.ingredients.length ? "bg-leaf/30 text-leaf-deep" : "bg-mist text-muted"}`}>
                      {r.ingredients.length ? t("recipes.ingredients", { n: r.ingredients.length }) : t("supply.noRecipe")}
                    </span>
                  </button>
                ),
              )}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function RecipeEditor({ recipe, onDone }: { recipe: Recipe; onDone: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [name, setName] = useState(recipe.name);
  const [category, setCategory] = useState(recipe.category);
  const [rows, setRows] = useState<Ingredient[]>(
    recipe.ingredients.length ? recipe.ingredients : [{ name: "", qtyPerPerson: 0, unit: "g" }],
  );
  const [busy, setBusy] = useState(false);

  const update = (i: number, patch: Partial<Ingredient>) =>
    setRows((cur) => cur.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const id = recipe.id || slugify(name) || String(Date.now());
      await setDoc(doc(db, "recipes", id), {
        name: name.trim(),
        category,
        ingredients: rows
          .filter((r) => r.name.trim() && Number(r.qtyPerPerson) > 0)
          .map((r) => ({ name: r.name.trim(), unit: r.unit, qtyPerPerson: Number(r.qtyPerPerson) })),
        updatedAt: Date.now(),
      });
      onDone();
    } catch (err) {
      toast({ text: err instanceof Error ? err.message : t("error"), tone: "error" });
      setBusy(false);
    }
  }

  async function remove() {
    if (!recipe.id || !confirm(t("recipes.deleteConfirm"))) return;
    await deleteDoc(doc(db, "recipes", recipe.id));
    onDone();
  }

  return (
    <form onSubmit={save} className="card space-y-4 border-amber ring-1 ring-amber/40">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">{t("recipes.dishName")}</label>
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">{t("recipes.category")}</label>
          <input className="input" list="cats" value={category} onChange={(e) => setCategory(e.target.value)} />
          <datalist id="cats">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
      </div>
      <div>
        <p className="label">{t("recipes.ingredient")} — {t("recipes.perPerson")}</p>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <input className="input col-span-12 sm:col-span-6" placeholder={t("recipes.ingredient")} value={r.name}
                onChange={(e) => update(i, { name: e.target.value })} />
              <input type="number" step="any" min={0} className="input col-span-5 sm:col-span-2" value={r.qtyPerPerson}
                aria-label={t("recipes.perPerson")}
                onChange={(e) => update(i, { qtyPerPerson: e.target.value === "" ? 0 : Number(e.target.value) })} />
              <select className="input col-span-4 sm:col-span-2" value={r.unit}
                onChange={(e) => update(i, { unit: e.target.value as Unit })}>
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
              <button type="button" className="col-span-3 text-xs text-danger sm:col-span-2"
                onClick={() => setRows((cur) => cur.filter((_, j) => j !== i))}>
                {t("remove")}
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn-outline mt-3"
          onClick={() => setRows((cur) => [...cur, { name: "", qtyPerPerson: 0, unit: "g" }])}>
          + {t("recipes.addIngredient")}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={busy}>{busy ? t("saving") : t("save")}</button>
        <button type="button" className="btn-outline" onClick={onDone}>{t("cancel")}</button>
        {recipe.id && (
          <button type="button" className="btn-danger ml-auto" onClick={remove}>{t("recipes.delete")}</button>
        )}
      </div>
    </form>
  );
}
