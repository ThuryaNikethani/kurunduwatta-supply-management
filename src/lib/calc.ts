import type { Recipe, SupplyItem, Unit } from "./types";

/** Round to at most 2 decimals, dropping trailing zeros. */
export function round(n: number) {
  return Math.round(n * 100) / 100;
}

/** Convert small units to large ones when the total is big enough. */
function normalise(qty: number, unit: Unit): { qty: number; unit: Unit } {
  if (unit === "g" && qty >= 1000) return { qty: qty / 1000, unit: "kg" };
  if (unit === "ml" && qty >= 1000) return { qty: qty / 1000, unit: "l" };
  return { qty, unit };
}

function base(qty: number, unit: Unit): { qty: number; unit: Unit } {
  if (unit === "kg") return { qty: qty * 1000, unit: "g" };
  if (unit === "l") return { qty: qty * 1000, unit: "ml" };
  return { qty, unit };
}

/**
 * Work out the total ingredient list for the chosen dishes and guest count.
 * Same ingredient used in several dishes is added together.
 */
export function calculateItems(recipes: Recipe[], guestCount: number): SupplyItem[] {
  const totals = new Map<string, { name: string; unit: Unit; qty: number }>();
  for (const r of recipes) {
    for (const ing of r.ingredients) {
      if (!ing.name.trim() || !ing.qtyPerPerson) continue;
      const b = base(ing.qtyPerPerson * guestCount, ing.unit);
      const key = `${ing.name.trim().toLowerCase()}|${b.unit}`;
      const cur = totals.get(key);
      if (cur) cur.qty += b.qty;
      else totals.set(key, { name: ing.name.trim(), unit: b.unit, qty: b.qty });
    }
  }
  return [...totals.values()]
    .map((t) => {
      const n = normalise(t.qty, t.unit);
      const qty = round(n.qty);
      return { name: t.name, unit: n.unit, qty, calculated: qty, note: "" };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function formatQty(qty: number, unit: string) {
  return `${round(qty)} ${unit}`;
}
