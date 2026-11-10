import { round } from "./calc";
import type { SupplyList, TransferOut, Unit } from "./types";

/** Monthly figures for the reports page, worked out from the records. */

export interface DayRow {
  day: number;
  guests: number;
  staff: number;
}

export interface MonthReport {
  approvedLists: number;
  peopleGuests: number;
  peopleStaff: number;
  leftoverPortions: number;
  /** Leftovers as a share of people cooked for (0–100). */
  leftoverPct: number;
  /** Average hours from first send to HR approval. */
  avgApprovalHours: number | null;
  waitingNow: number;
  days: DayRow[];
  topDishes: { name: string; count: number }[];
  ingredients: { name: string; unit: Unit; qty: number }[];
  leftovers: { dish: string; portions: number }[];
}

const monthOf = (iso: string) => iso.slice(0, 7); // "2026-11"

function base(qty: number, unit: Unit): { qty: number; unit: Unit } {
  if (unit === "kg") return { qty: qty * 1000, unit: "g" };
  if (unit === "l") return { qty: qty * 1000, unit: "ml" };
  return { qty, unit };
}

function tidy(qty: number, unit: Unit): { qty: number; unit: Unit } {
  if (unit === "g" && qty >= 1000) return { qty: qty / 1000, unit: "kg" };
  if (unit === "ml" && qty >= 1000) return { qty: qty / 1000, unit: "l" };
  return { qty, unit };
}

export function buildMonthReport(month: string, lists: SupplyList[], transfers: TransferOut[]): MonthReport {
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const approved = lists.filter((l) => l.status === "approved" && monthOf(l.eventDate) === month);
  const leftovers = transfers.filter((t) => t.status === "approved" && monthOf(t.date) === month);

  const days: DayRow[] = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, guests: 0, staff: 0 }));
  const dishCount = new Map<string, number>();
  const ing = new Map<string, { name: string; unit: Unit; qty: number }>();
  let peopleGuests = 0;
  let peopleStaff = 0;
  const hours: number[] = [];

  for (const l of approved) {
    const d = Number(l.eventDate.slice(8, 10));
    const row = days[d - 1];
    if ((l.audience ?? "guests") === "staff") {
      peopleStaff += l.guestCount;
      if (row) row.staff += l.guestCount;
    } else {
      peopleGuests += l.guestCount;
      if (row) row.guests += l.guestCount;
    }
    for (const dish of l.dishes) dishCount.set(dish.name, (dishCount.get(dish.name) ?? 0) + 1);
    for (const it of l.items) {
      const b = base(it.qty, it.unit);
      const key = `${it.name.trim().toLowerCase()}|${b.unit}`;
      const cur = ing.get(key);
      if (cur) cur.qty += b.qty;
      else ing.set(key, { name: it.name.trim(), unit: b.unit, qty: b.qty });
    }
    const sent = l.history.find((h) => h.action === "submit")?.at;
    const done = [...l.history].reverse().find((h) => h.action === "approve")?.at;
    if (sent && done && done > sent) hours.push((done - sent) / 3_600_000);
  }

  const leftoverByDish = new Map<string, number>();
  let leftoverPortions = 0;
  for (const t of leftovers)
    for (const it of t.items) {
      leftoverPortions += it.portions;
      leftoverByDish.set(it.dish, (leftoverByDish.get(it.dish) ?? 0) + it.portions);
    }

  const cooked = peopleGuests + peopleStaff;
  return {
    approvedLists: approved.length,
    peopleGuests,
    peopleStaff,
    leftoverPortions,
    leftoverPct: cooked ? round((leftoverPortions / cooked) * 100) : 0,
    avgApprovalHours: hours.length ? round(hours.reduce((a, b) => a + b, 0) / hours.length) : null,
    waitingNow: lists.filter((l) => l.status !== "approved").length + transfers.filter((t) => t.status !== "approved").length,
    days,
    topDishes: [...dishCount.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8),
    ingredients: [...ing.values()]
      .map((i) => {
        const t = tidy(i.qty, i.unit);
        return { name: i.name, unit: t.unit, qty: round(t.qty) };
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
    leftovers: [...leftoverByDish.entries()].map(([dish, portions]) => ({ dish, portions })).sort((a, b) => b.portions - a.portions),
  };
}

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
