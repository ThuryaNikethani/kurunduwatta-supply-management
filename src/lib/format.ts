import { translate } from "./i18n";
import type { Unit } from "./types";

const MONTHS = [
  "ජනවාරි", "පෙබරවාරි", "මාර්තු", "අප්‍රේල්", "මැයි", "ජූනි",
  "ජූලි", "අගෝස්තු", "සැප්තැම්බර්", "ඔක්තෝබර්", "නොවැම්බර්", "දෙසැම්බර්",
];

/** Date in simple Sinhala, e.g. "2026 නොවැම්බර් 10". */
export function formatDate(value: string | number) {
  const d = typeof value === "number" ? new Date(value) : new Date(`${value}T00:00:00`);
  if (isNaN(d.getTime())) return String(value);
  return `${d.getFullYear()} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Date and time, e.g. "නොවැම්බර් 10 · ප.ව. 2.05". */
export function formatDateTime(ms: number) {
  const d = new Date(ms);
  const h = d.getHours();
  const part = h < 12 ? "පෙ.ව." : "ප.ව.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${MONTHS[d.getMonth()]} ${d.getDate()} · ${part} ${h12}.${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Unit name in Sinhala, e.g. "kg" → "කිලෝ". */
export function unitLabel(unit: Unit | string) {
  return translate(`unit.${unit}` as Parameters<typeof translate>[0]);
}

/** Quantity with its Sinhala unit, e.g. "2.5 කිලෝ". */
export function qty(n: number, unit: Unit | string) {
  return `${Math.round(n * 100) / 100} ${unitLabel(unit)}`;
}

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
