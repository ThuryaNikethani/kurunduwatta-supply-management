"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Field } from "@/components/common";
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
import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { backend } from "@/lib/backend";
import { errorText, useI18n } from "@/lib/i18n";
import { CATEGORIES, STAFF_CATEGORIES, newDishId } from "@/lib/menu";
import { fieldErrors, recipeSchema } from "@/lib/schemas";
import type { Ingredient, Recipe } from "@/lib/types";

/**
 * Add or edit a dish and its per-person amounts. Used on the recipes page and
 * from the supply list form (to add a dish that isn't on the menu yet).
 */
export function RecipeEditor({
  recipe, onDone, ingredientsOptional,
}: {
  recipe: Recipe;
  /** Called with the saved dish, or nothing if cancelled/deleted. */
  onDone: (saved?: Recipe) => void;
  ingredientsOptional?: boolean;
}) {
  const menu = recipe.menu ?? "guests";
  const categories = menu === "staff" ? STAFF_CATEGORIES : CATEGORIES;
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
      const saved = { ...parsed.data, menu, reviewed: true, updatedAt: Date.now() };
      await backend.saveRecipe(id, saved);
      toast.success(t("recipes.saved"));
      onDone({ id, ...saved });
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
      </DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("recipes.dishName")} htmlFor="r-name" error={errors.name}>
          <Input id="r-name" value={name} aria-invalid={!!errors.name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t("recipes.category")} htmlFor="r-cat" error={errors.category}>
          <Input id="r-cat" list="cats" value={category} onChange={(e) => setCategory(e.target.value)} />
          <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
      </div>
      <div className="grid gap-2">
        <p className="text-base font-semibold">
          {t("recipes.ingredient")} — {t("recipes.perPerson")}
          {ingredientsOptional && <span className="ml-1 normal-case">({t("recipes.optional")})</span>}
        </p>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-12 items-start gap-2 border-b pb-3 sm:border-0 sm:pb-0">
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
          <Button type="button" variant="outline" onClick={() => setRows((cur) => [...cur, { name: "", qtyPerPerson: 0, unit: "g" }])}>
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
          <Button type="button" variant="outline" onClick={() => onDone()}>{t("cancel")}</Button>
          <Button type="submit" variant="accent" disabled={busy}>{busy ? t("saving") : t("save")}</Button>
        </div>
      </DialogFooter>
      {Object.values(errors).some(Boolean) && <p className="text-sm text-destructive">{t("v.fix")}</p>}
    </form>
  );
}
