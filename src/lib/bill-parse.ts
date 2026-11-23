import type { BillDetails, BillItem } from "./types";

/**
 * Picks the shop, date, total and items out of the text read from a bill photo.
 * Bills look very different, so this only guesses; HR always checks before saving.
 */

const TOTAL_WORDS = /(grand\s*total|net\s*total|net\s*amount|total\s*amount|amount\s*due|bill\s*total|total|මුළු|එකතුව|මුදල)/i;
const SUBTOTAL_WORDS = /(sub\s*-?\s*total|total\s*(items?|qty|quantity|no)|no\.?\s*of\s*items|items?\s*count)/i;
// Lines that hold money but are not what was bought or the bill total.
const NOT_ITEM = /(total|cash|tender|change|balance|discount|saving|vat|tax|card|visa|master|paid|due|round|ඉතිරි|වට්ටම්|එකතුව|මුළු|ගෙවූ|මුදල)/i;
const HEADER_WORDS = /(tel|phone|fax|mobile|hotline|e-?mail|www\.|\.com|\.lk|invoice|receipt|bill\s*no|cashier|counter|terminal|reg\s*no|vat\s*no|road|rd\.|street|mawatha|lane|colombo|දුරකථන|ලදුපත|පාර|මාවත)/i;
const UNIT = String.raw`(?:kg|g|gm|gms|grams?|l|ltr|litres?|ml|pcs?|pkt|pack|btl|nos?|කි\.?|කිලෝ|ග්‍රෑම්|ලී\.?|ලීටර්)`;

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

/** Common mistakes when reading digits (O for 0, l for 1, S for 5). */
function fixDigits(s: string) {
  return s
    // "Skg" / "S00g": an S right before a unit or digits is a 5.
    .replace(/(?<![\p{L}\d])[sS](?=\d*\s*(?:kg|g|l|ml|pcs)\b)/giu, "5")
    .replace(/(?<=\d)[oO](?=\d|\b)|(?<=\b)[oO](?=\d)/g, "0").replace(/(?<=\d)[lI|](?=\d)/g, "1").replace(/(?<=\d)[sS](?=\d)/g, "5");
}

/** Money written on a bill ("1,250.00", "1250/-", "Rs. 450") as a number. */
export function readMoney(s: string): number | null {
  const m = fixDigits(s).replace(/rs\.?|රු\.?|lkr|\/-|=/gi, " ").match(/(\d{1,3}(?:,\d{3})+|\d+)(?:[.,](\d{1,2}))?\s*$/);
  if (!m) return null;
  const n = Number(`${m[1].replace(/,/g, "")}.${m[2] ?? "0"}`);
  return Number.isFinite(n) && n > 0 && n < 10_000_000 ? Math.round(n * 100) / 100 : null;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function validDate(y: number, m: number, d: number) {
  if (y < 100) y += 2000;
  if (y < 2015 || m < 1 || m > 12 || d < 1 || d > 31) return "";
  const date = new Date(y, m - 1, d);
  if (date.getMonth() !== m - 1) return "";
  // A bill is never from the future (one day of slack for clocks).
  if (date.getTime() > Date.now() + 86_400_000) return "";
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** The first date on the bill as YYYY-MM-DD, or "". Sri Lankan bills write day first. */
export function findDate(text: string) {
  const t = fixDigits(text);
  const patterns: [RegExp, (m: RegExpMatchArray) => string][] = [
    [/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/, (m) => validDate(+m[1], +m[2], +m[3])],
    [/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2}|\d{2})\b/, (m) => validDate(+m[3], +m[2], +m[1]) || validDate(+m[3], +m[1], +m[2])],
    [/\b(\d{1,2})[\s-]*([a-z]{3,4})[a-z]*[\s,-]*(20\d{2})\b/i, (m) => (MONTHS[m[2].toLowerCase()] ? validDate(+m[3], MONTHS[m[2].toLowerCase()], +m[1]) : "")],
    [/\b([a-z]{3,4})[a-z]*[\s-]*(\d{1,2})[\s,-]+(20\d{2})\b/i, (m) => (MONTHS[m[1].toLowerCase()] ? validDate(+m[3], MONTHS[m[1].toLowerCase()], +m[2]) : "")],
  ];
  for (const line of t.split("\n")) {
    for (const [re, make] of patterns) {
      const m = line.match(re);
      const d = m ? make(m) : "";
      if (d) return d;
    }
  }
  return "";
}

const letters = (s: string) => (s.match(/[a-z඀-෿]/gi) ?? []).length;

/** Remove a date or time from a line so it is not taken for money. */
const stripDateTime = (s: string) =>
  s.replace(/\b\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}\b/g, " ").replace(/\b\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?\b/gi, " ");

/** The shop's name: the first line near the top that reads like a name. */
function findShop(lines: string[]) {
  for (const line of lines.slice(0, 6)) {
    const clean = line.replace(/[^\p{L}\p{M}\d\s&'.-]/gu, " ").replace(/\s+/g, " ").trim();
    if (letters(clean) < 3 || HEADER_WORDS.test(clean) || TOTAL_WORDS.test(clean) || findDate(clean)) continue;
    // Mostly digits (an address number, a phone number) is not a name.
    if ((clean.match(/\d/g) ?? []).length > letters(clean)) continue;
    return clean;
  }
  return "";
}

/** The bill total: the amount on a "total" line, else the biggest amount on the bill. */
function findTotal(lines: string[]) {
  let best: { n: number; rank: number } | null = null;
  lines.forEach((line, i) => {
    if (!TOTAL_WORDS.test(line) || SUBTOTAL_WORDS.test(line)) return;
    const n = readMoney(stripDateTime(line)) ?? (i + 1 < lines.length && letters(lines[i + 1]) === 0 ? readMoney(lines[i + 1]) : null);
    if (!n) return;
    // "Grand total" / "net total" beat a plain "total"; later lines beat earlier ones.
    const rank = (/(grand|net|amount\s*due|bill\s*total)/i.test(line) ? 2 : 1) * 1000 + i;
    if (!best || rank > best.rank) best = { n, rank };
  });
  if (best) return (best as { n: number }).n;
  const amounts = lines
    .filter((l) => !/(cash|tender|change|balance|ඉතිරි|ගෙවූ)/i.test(l) && !findDate(l))
    .map((l) => readMoney(stripDateTime(l)))
    .filter((n): n is number => n !== null);
  return amounts.length ? Math.max(...amounts) : 0;
}

/** Lines that look like "name … amount", read before the total. */
function findItems(lines: string[]) {
  const items: BillItem[] = [];
  const end = lines.findIndex((l) => TOTAL_WORDS.test(l) && !SUBTOTAL_WORDS.test(l));
  for (const raw of end > 0 ? lines.slice(0, end) : lines) {
    if (findDate(raw)) continue;
    const line = stripDateTime(raw);
    if (NOT_ITEM.test(line) || HEADER_WORDS.test(line) || letters(line) < 2) continue;
    const amount = readMoney(line);
    if (!amount) continue;
    // Text before the first number is the name; an amount with a unit is the quantity.
    const name = line.replace(/[\d.,\s/*xX@=-]+$/, "").split(/\s{2,}|\t|\s\d/)[0].replace(/^[\d.)\s-]+/, "").trim();
    if (letters(name) < 2) continue;
    const qtyMatch = line.slice(name.length).match(new RegExp(String.raw`(\d+(?:[.,]\d+)?\s*${UNIT})(?![a-z])`, "i"));
    // Without a unit, a lone number between the name and the price is the count ("පොල් 4 400.00").
    const count = line.slice(name.length).trim().match(/^(\d+(?:\.\d+)?)\s+\S/);
    const qty = qtyMatch ? qtyMatch[1].replace(/\s+/g, " ").trim() : count ? count[1] : "";
    items.push({ name, qty, amount });
  }
  return items;
}

export function parseBillText(text: string): BillDetails {
  // A stray "no join" mark often sticks to Sinhala words read from photos.
  const lines = fixDigits(text.replace(/‌/g, ""))
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 1);
  return { shop: findShop(lines), date: findDate(lines.join("\n")), total: findTotal(lines), items: findItems(lines) };
}
