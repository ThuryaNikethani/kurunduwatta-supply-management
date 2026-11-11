import { round } from "./calc";
import type { OrderItem, StockIssue, StockItem, StockLine, SupplyItem, Unit } from "./types";

/** Convert an amount to another unit if they measure the same thing. */
export function convert(qty: number, from: Unit, to: Unit): number | null {
  if (from === to) return qty;
  if (from === "g" && to === "kg") return qty / 1000;
  if (from === "kg" && to === "g") return qty * 1000;
  if (from === "ml" && to === "l") return qty / 1000;
  if (from === "l" && to === "ml") return qty * 1000;
  return null;
}

/** The stock item for a supply/order line: same name, compatible unit. */
export function findStock(items: StockItem[], name: string, unit: Unit) {
  const n = name.trim().toLowerCase();
  return items.find((i) => i.name.trim().toLowerCase() === n && convert(1, unit, i.unit) !== null) ?? null;
}

export const isLow = (i: StockItem) => i.minQty > 0 && i.qty <= i.minQty;

export interface IssueRow {
  name: string;
  /** What the list needs, in the stock item's unit when matched. */
  need: number;
  unit: Unit;
  item: StockItem | null;
  give: number;
  short: number;
}

/**
 * What taking a supply list out of stock would do, line by line.
 * Only dry goods are kept in the store; anything not in stock is bought
 * fresh from the shop, so it is never "short" (item stays null).
 */
export function previewIssue(items: SupplyItem[], stock: StockItem[]): IssueRow[] {
  return items.map((it) => {
    const s = findStock(stock, it.name, it.unit);
    if (!s) return { name: it.name, need: it.qty, unit: it.unit, item: null, give: 0, short: 0 };
    const need = round(convert(it.qty, it.unit, s.unit) ?? 0);
    const give = round(Math.min(need, s.qty));
    return { name: it.name, need, unit: s.unit, item: s, give, short: round(need - give) };
  });
}

/** Lines to send to the database for an issue. */
export function issueLines(rows: IssueRow[]): StockLine[] {
  return rows
    .filter((r) => r.item && r.give > 0)
    .map((r) => ({ itemId: r.item!.id, name: r.item!.name, unit: r.item!.unit, qty: r.give }));
}

/** Order lines for things that are short. */
export function shortagesToOrder(rows: IssueRow[]): OrderItem[] {
  return rows.filter((r) => r.short > 0).map((r) => ({ name: r.name, unit: r.unit, qty: r.short, note: "" }));
}

/** Suggested order for everything running low: back up to twice the minimum. */
export function lowStockOrder(stock: StockItem[]): OrderItem[] {
  return stock
    .filter(isLow)
    .map((i) => ({ name: i.name, unit: i.unit, qty: round(Math.max(i.minQty * 2 - i.qty, i.minQty)), note: "" }));
}

/** Receiving an order: match each line to stock (or create a new item). */
export function receiveLines(items: OrderItem[], stock: StockItem[]): (StockLine & { isNew: boolean })[] {
  return items.map((o) => {
    const s = findStock(stock, o.name, o.unit);
    if (!s) return { itemId: null, name: o.name.trim(), unit: o.unit, qty: o.qty, isNew: true };
    return { itemId: s.id, name: s.name, unit: s.unit, qty: round(convert(o.qty, o.unit, s.unit) ?? o.qty), isNew: false };
  });
}

/** After a list was issued: what it still needed but stock didn't have (store items only). */
export function shortagesAfterIssue(items: SupplyItem[], issue: StockIssue, stock: StockItem[]): OrderItem[] {
  const out: OrderItem[] = [];
  for (const it of items) {
    const line = issue.lines.find((l) => l.name.trim().toLowerCase() === it.name.trim().toLowerCase() && convert(1, it.unit, l.unit) !== null);
    // Not kept in the store → bought fresh, not a shortage.
    if (!line && !findStock(stock, it.name, it.unit)) continue;
    const need = line ? (convert(it.qty, it.unit, line.unit) ?? 0) : it.qty;
    const short = round(need - (line?.qty ?? 0));
    if (short > 0) out.push({ name: it.name, unit: line?.unit ?? it.unit, qty: short, note: "" });
  }
  return out;
}
