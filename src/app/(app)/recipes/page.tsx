"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Check, ChevronRight, ClipboardCheck, Download, Plus, Search, Trash2 } from "lucide-react";
import { CardsSkeleton, EmptyState, Field, PageHeader } from "@/components/common";
import { UnitSelect } from "@/components/SupplyForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { backend } from "@/lib/backend";
import { useRecipes } from "@/lib/hooks";
import { errorText, useI18n } from "@/lib/i18n";
import { qty } from "@/lib/format";
import { DEFAULT_INGREDIENTS } from "@/lib/default-recipes";
import { CATEGORIES, MENU, newDishId } from "@/lib/menu";
import { fieldErrors, recipeSchema } from "@/lib/schemas";
import type { Ingredient, Recipe } from "@/lib/types";

export default function RecipesPage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const recipes = useRecipes();
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const canEdit = profile?.role === "chef" || profile?.role === "hr";
  const [show, setShow] = useState<"all" | "todo" | "done">("all");

  // The dashboard reminder links here with ?filter=todo.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("filter") === "todo") setShow("todo");
  }, []);

  const total = recipes.data?.length ?? 0;
  const done = (recipes.data ?? []).filter((r) => r.reviewed).length;

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, Recipe[]>();
    for (const r of recipes.data ?? []) {
      if (q && !r.name.toLowerCase().includes(q)) continue;
      if (show === "todo" && r.reviewed) continue;
      if (show === "done" && !r.reviewed) continue;
      map.set(r.category, [...(map.get(r.category) ?? []), r]);
    }
    return [...map.entries()];
  }, [recipes.data, search, show]);

  async function loadMenu() {
    setBusy(true);
    try {
      const now = Date.now();
      const existing = new Map((recipes.data ?? []).map((r) => [r.id, r]));
      const menu = MENU.flatMap(({ category, dishes }) =>
        dishes.map(([id, name]) => ({ id, name, category, ingredients: DEFAULT_INGREDIENTS[id] ?? [], reviewed: false, updatedAt: now })),
      );
      // New dishes come with starting amounts.
      await backend.addRecipes(menu.filter((r) => !existing.has(r.id)));
      // Dishes already here but still empty get the starting amounts too.
      // Anything the chef already entered is left alone.
      for (const r of menu) {
        const cur = existing.get(r.id);
        if (cur && !cur.ingredients?.length && r.ingredients.length)
          await backend.saveRecipe(cur.id, { name: cur.name, category: cur.category, ingredients: r.ingredients, reviewed: false, updatedAt: now });
      }
      toast.success(t("recipes.loaded"));
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t("recipes.title")}
        subtitle={t("recipes.intro")}
        actions={
          canEdit && (
            <>
              <Button variant="outline" onClick={loadMenu} disabled={busy}><Download /> {t("recipes.load")}</Button>
              <Button variant="accent" onClick={() => setEditing({ id: "", name: "", category: CATEGORIES[0], ingredients: [] })}>
                <Plus /> {t("recipes.addDish")}
              </Button>
            </>
          )
        }
      />

      {total > 0 && (
        <Card className="gap-3 py-4">
          <CardContent className="grid gap-2 px-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 font-medium">
                <ClipboardCheck className="size-4 text-moss" /> {t("recipes.progress", { done, total })}
              </span>
              {done < total && <span className="text-xs text-muted-foreground">{t("recipes.progressHint")}</span>}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label={t("recipes.progress", { done, total })}
              aria-valuenow={done} aria-valuemin={0} aria-valuemax={total}>
              <div className="h-full rounded-full bg-leaf-deep transition-all" style={{ width: `${(done / total) * 100}%` }} />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="bg-card pl-9" placeholder={t("supply.searchDish")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 rounded-full bg-secondary p-1" role="radiogroup" aria-label={t("recipes.filter")}>
          {(["all", "todo", "done"] as const).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={show === k} onClick={() => setShow(k)}
              className={`rounded-full px-3 py-1 text-sm transition ${show === k ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>
              {t(k === "all" ? "dash.all" : k === "todo" ? "recipes.todo" : "recipes.done")}
            </button>
          ))}
        </div>
      </div>

      {!recipes.data ? (
        <CardsSkeleton count={6} />
      ) : recipes.data.length === 0 ? (
        <EmptyState icon={BookOpen} text={t("recipes.empty")} />
      ) : (
        grouped.map(([cat, list]) => (
          <section key={cat} className="grid gap-3">
            <h2 className="font-display text-2xl font-semibold">{cat}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((r) => (
                <button key={r.id} disabled={!canEdit} onClick={() => setEditing(r)} className="group text-left disabled:cursor-default">
                  <Card className="h-full gap-2 py-4 transition group-enabled:group-hover:shadow-md">
                    <CardContent className="grid gap-2 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">{r.name}</p>
                        {canEdit && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
                      </div>
                      {r.ingredients.length > 0 ? (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {r.ingredients.map((i) => `${i.name} ${qty(i.qtyPerPerson, i.unit)}`).join(" · ")}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="secondary" className="rounded-full">
                          {r.ingredients.length ? t("recipes.ingredients", { n: r.ingredients.length }) : t("supply.noRecipe")}
                        </Badge>
                        {r.ingredients.length > 0 && (
                          <Badge variant="secondary" className={r.reviewed ? "rounded-full bg-leaf/30 text-leaf-deep" : "rounded-full bg-amber/20 text-amber-deep"}>
                            {r.reviewed && <Check />}
                            {t(r.reviewed ? "recipes.reviewed" : "recipes.needsCheck")}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          </section>
        ))
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {editing && <RecipeEditor key={editing.id || "new"} recipe={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RecipeEditor({ recipe, onDone }: { recipe: Recipe; onDone: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(recipe.name);
  const [category, setCategory] = useState(recipe.category);
  const [rows, setRows] = useState<Ingredient[]>(
    recipe.ingredients.length ? recipe.ingredients : [{ name: "", qtyPerPerson: 0, unit: "g" }],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const update = (i: number, patch: Partial<Ingredient>) =>
    setRows((cur) => cur.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    // Blank rows are ignored; partly filled rows are validated.
    const filled = rows.filter((r) => r.name.trim() || r.qtyPerPerson);
    const parsed = recipeSchema.safeParse({ name, category, ingredients: filled });
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error);
      // map filtered indexes back to visible rows
      const mapped: Record<string, string> = {};
      for (const [k, v] of Object.entries(errs)) {
        const m = k.match(/^ingredients\.(\d+)\.(.+)$/);
        mapped[m ? `ingredients.${rows.indexOf(filled[+m[1]])}.${m[2]}` : k] = v;
      }
      return setErrors(mapped);
    }
    setErrors({});
    setBusy(true);
    try {
      const id = recipe.id || newDishId(parsed.data.name);
      // Saving from the editor means the chef has checked it.
      await backend.saveRecipe(id, { ...parsed.data, reviewed: true, updatedAt: Date.now() });
      toast.success(t("recipes.saved"));
      onDone();
    } catch (err) {
      toast.error(errorText(err));
      setBusy(false);
    }
  }

  async function remove() {
    await backend.deleteRecipe(recipe.id);
    onDone();
  }

  return (
    <form onSubmit={save} className="grid gap-5" noValidate>
      <DialogHeader>
        <DialogTitle className="font-display text-2xl">{recipe.id ? recipe.name : t("recipes.addDish")}</DialogTitle>
        <p className="text-sm text-muted-foreground">{t("recipes.saveMarks")}</p>
      </DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("recipes.dishName")} htmlFor="r-name" error={errors.name}>
          <Input id="r-name" value={name} aria-invalid={!!errors.name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t("recipes.category")} htmlFor="r-cat" error={errors.category}>
          <Input id="r-cat" list="cats" value={category} onChange={(e) => setCategory(e.target.value)} />
          <datalist id="cats">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
      </div>
      <div className="grid gap-2">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          {t("recipes.ingredient")} — {t("recipes.perPerson")}
        </p>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-12 items-start gap-2">
            <Field error={errors[`ingredients.${i}.name`]} className="col-span-12 sm:col-span-6">
              <Input placeholder={t("recipes.ingredient")} value={r.name} aria-invalid={!!errors[`ingredients.${i}.name`]}
                onChange={(e) => update(i, { name: e.target.value })} />
            </Field>
            <Field error={errors[`ingredients.${i}.qtyPerPerson`]} className="col-span-5 sm:col-span-3">
              <Input type="number" step="any" min={0} inputMode="decimal" aria-label={t("recipes.perPerson")}
                value={r.qtyPerPerson || ""} aria-invalid={!!errors[`ingredients.${i}.qtyPerPerson`]}
                onChange={(e) => update(i, { qtyPerPerson: e.target.value === "" ? 0 : Number(e.target.value) })} />
            </Field>
            <div className="col-span-5 sm:col-span-2">
              <UnitSelect value={r.unit} onChange={(unit) => update(i, { unit })} />
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label={t("remove")} className="col-span-2 justify-self-end text-destructive hover:text-destructive sm:col-span-1"
              onClick={() => setRows((cur) => cur.filter((_, j) => j !== i))}>
              <Trash2 />
            </Button>
          </div>
        ))}
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => setRows((cur) => [...cur, { name: "", qtyPerPerson: 0, unit: "g" }])}>
            <Plus /> {t("recipes.addIngredient")}
          </Button>
        </div>
      </div>
      <DialogFooter className="gap-2 sm:justify-between">
        {recipe.id ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive"><Trash2 /> {t("recipes.delete")}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("recipes.deleteConfirm")}</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={remove} className="bg-destructive text-white hover:bg-destructive/90">{t("confirm")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : <span />}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onDone}>{t("cancel")}</Button>
          <Button type="submit" variant="accent" disabled={busy}>{busy ? t("saving") : t("save")}</Button>
        </div>
      </DialogFooter>
      {Object.values(errors).some(Boolean) && <p className="text-sm text-destructive">{t("v.fix")}</p>}
    </form>
  );
}
