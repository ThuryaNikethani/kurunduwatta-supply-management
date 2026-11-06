import type { Lang } from "./i18n";

export function formatDate(value: string | number, lang: Lang) {
  const d = typeof value === "number" ? new Date(value) : new Date(`${value}T00:00:00`);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(lang === "si" ? "si-LK" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(ms: number, lang: Lang) {
  return new Date(ms).toLocaleString(lang === "si" ? "si-LK" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
