"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Check, ChevronRight, Download, Plus, Search } from "lucide-react";
import { CardsSkeleton, EmptyState, PageHeader } from "@/components/common";
import { RecipeEditor } from "@/components/RecipeEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { backend } from "@/lib/backend";
import { useRecipes } from "@/lib/hooks";
import { errorText, useI18n } from "@/lib/i18n";
import { qty } from "@/lib/format";
import { DEFAULT_INGREDIENTS } from "@/lib/default-recipes";
import { CATEGORIES, MENU, STAFF_MENU } from "@/lib/menu";
import type { Audience, Recipe } from "@/lib/types";

export default function RecipesPage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const recipes = useRecipes();
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const canEdit = profile?.role === "chef" || profile?.role === "hr";
  /** Staff lists are written by hand, so only the guest menu is shown. */
  const menu: Audience = "guests";
  const inMenu = useMemo(() => (recipes.data ?? []).filter((r) => (r.menu ?? "guests") === menu), [recipes.data, menu]);


  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, Recipe[]>();
    for (const r of inMenu) {
      if (q && !r.name.toLowerCase().includes(q)) continue;
      map.set(r.category, [...(map.get(r.category) ?? []), r]);
    }
    return [...map.entries()];
  }, [inMenu, search]);

  async function loadMenu() {
    setBusy(true);
    try {
      const now = Date.now();
      const existing = new Map((recipes.data ?? []).map((r) => [r.id, r]));
      const all = [
        ...MENU.flatMap(({ category, dishes }) => dishes.map(([id, name]) => ({ id, name, category, menu: "guests" as const }))),
        ...STAFF_MENU.flatMap(({ category, dishes }) => dishes.map(([id, name]) => ({ id, name, category, menu: "staff" as const }))),
      ].map((d) => ({ ...d, ingredients: DEFAULT_INGREDIENTS[d.id] ?? [], reviewed: false, updatedAt: now }));
      // New dishes (guest menu and staff meals) come with starting amounts.
      await backend.addRecipes(all.filter((r) => !existing.has(r.id)));
      // Dishes already here but still empty get the starting amounts too.
      // Anything the chef already entered is left alone.
      for (const r of all) {
        const cur = existing.get(r.id);
        if (cur && !cur.ingredients?.length && r.ingredients.length)
          await backend.saveRecipe(cur.id, { name: cur.name, category: cur.category, menu: cur.menu ?? r.menu, ingredients: r.ingredients, reviewed: false, updatedAt: now });
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
              {profile?.role === "hr" && <Button variant="outline" onClick={loadMenu} disabled={busy}><Download /> {t("recipes.load")}</Button>}
              <Button variant="accent" onClick={() => setEditing({ id: "", name: "", menu, category: CATEGORIES[0], ingredients: [] })}>
                <Plus /> {t("recipes.addDish")}
              </Button>
            </>
          )
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input className="bg-card pl-10" placeholder={t("supply.searchDish")} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {!recipes.data ? (
        <CardsSkeleton count={6} />
      ) : inMenu.length === 0 ? (
        <EmptyState icon={BookOpen} text={t("recipes.empty")} />
      ) : (
        grouped.map(([cat, list]) => (
          <section key={cat} className="grid gap-3">
            <h2 className="text-lg font-semibold">{cat}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((r) => (
                <button key={r.id} disabled={!canEdit} onClick={() => setEditing(r)} className="group text-left disabled:cursor-default">
                  <Card className="h-full gap-2 py-4 transition group-enabled:group-hover:shadow-md">
                    <CardContent className="grid gap-2 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-lg font-semibold">{r.name}</p>
                        {canEdit && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
                      </div>
                      {r.ingredients.length > 0 ? (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
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
