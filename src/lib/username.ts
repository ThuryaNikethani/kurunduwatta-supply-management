/**
 * Login names can be Sinhala or English. Different keyboards type the same
 * Sinhala word with or without invisible joiners (e.g. for "්‍ය" / "්‍ර"), and
 * English may be typed in any case, so names are compared by this key.
 */
export function usernameKey(name: string) {
  return name
    .normalize("NFC")
    .replace(/[​-‍⁠﻿]/g, "")
    .trim()
    .toLowerCase();
}

/** True if what was typed matches the account's English or Sinhala login name. */
export function loginNameMatches(typed: string, row: { username?: string | null; username_si?: string | null }) {
  const want = usernameKey(typed);
  return [row.username, row.username_si].some((n) => !!n && usernameKey(n) === want);
}

/** Sinhala letters written the way they sound in English (vowels dropped later). */
const SINHALA_SOUND: Record<string, string> = {
  ක: "k", ඛ: "k", ග: "g", ඝ: "g", ඞ: "n", ඟ: "ng", ච: "ch", ඡ: "ch", ජ: "j", ඣ: "j", ඤ: "n", ඥ: "gn", ඦ: "nj",
  ට: "t", ඨ: "t", ඩ: "d", ඪ: "d", ණ: "n", ඬ: "nd", ත: "t", ථ: "t", ද: "d", ධ: "d", න: "n", ඳ: "nd",
  ප: "p", ඵ: "p", බ: "b", භ: "b", ම: "m", ඹ: "mb", ය: "y", ර: "r", ල: "l", ව: "v", ශ: "sh", ෂ: "sh", ස: "s",
  හ: "h", ළ: "l", ෆ: "f", ඍ: "r", ඎ: "r", ඏ: "l", ඐ: "l",
  // signs that sit on a letter: "ං" (n) and the "ru" signs
  "ං": "n", "ෘ": "r", "ෲ": "r",
};

const VOWEL_SIGN: Record<string, string> = {
  "ා": "a", "ැ": "a", "ෑ": "a", "ි": "i", "ී": "i", "ු": "u", "ූ": "u",
  "ෙ": "e", "ේ": "e", "ෛ": "ai", "ො": "o", "ෝ": "o", "ෞ": "au", "ෟ": "lu",
};
const VOWEL_LETTER: Record<string, string> = {
  අ: "a", ආ: "a", ඇ: "a", ඈ: "a", ඉ: "i", ඊ: "i", උ: "u", ඌ: "u", එ: "e", ඒ: "e", ඓ: "ai", ඔ: "o", ඕ: "o", ඖ: "au",
};
const HAL = "්";

/**
 * A name spelt the simple way people type Sinhala in English letters, vowels
 * kept: උම්බලකඩ → "umbalakada", බිත්තර and "biththara" → "bitara".
 */
export function singlishSpelling(name: string) {
  const chars = [...usernameKey(name)];
  let out = "";
  chars.forEach((ch, i) => {
    if (VOWEL_LETTER[ch]) out += VOWEL_LETTER[ch];
    else if (VOWEL_SIGN[ch]) out += VOWEL_SIGN[ch];
    else if (ch === HAL) return;
    else if (SINHALA_SOUND[ch] !== undefined && !"ංෘෲ".includes(ch)) {
      const next = chars[i + 1];
      // A letter with no sign after it says "a".
      out += SINHALA_SOUND[ch] + (next && (next === HAL || VOWEL_SIGN[next]) ? "" : "a");
    } else if (/[඀-෿]/.test(ch)) out += SINHALA_SOUND[ch] ?? "";
    else out += ch;
  });
  return out
    .replace(/th/g, "t").replace(/dh/g, "d").replace(/sh/g, "s").replace(/ph/g, "f").replace(/bh/g, "b")
    .replace(/kh/g, "k").replace(/gh/g, "g").replace(/w/g, "v").replace(/ee/g, "i").replace(/oo/g, "u").replace(/ae/g, "a")
    .replace(/[^a-z ]/g, "")
    .replace(/(.)\1+/g, "$1");
}

/**
 * The "sound" of a name with the vowels taken out, so a name typed in Sinhala
 * finds the same account as its English spelling: තූර්යා and thurya both give
 * "tr", චන්දන and chandana both give "cndn". Only used when no name matches
 * exactly, and the password must still be right.
 */
export function loginSkeleton(name: string) {
  const sound = [...usernameKey(name)].map((ch) => (/[඀-෿]/.test(ch) ? (SINHALA_SOUND[ch] ?? "") : ch)).join("");
  return sound
    .replace(/ch/g, "č") // keep "ch" apart from a hard "c"
    .replace(/sh/g, "s").replace(/th/g, "t").replace(/dh/g, "d").replace(/ph/g, "p")
    .replace(/bh/g, "b").replace(/kh/g, "k").replace(/gh/g, "g").replace(/jh/g, "j")
    .replace(/c/g, "k").replace(/q/g, "k").replace(/x/g, "ks").replace(/z/g, "s").replace(/f/g, "p").replace(/w/g, "v")
    .replace(/č/g, "c")
    .replace(/[^a-z]/g, "")
    .replace(/[aeiouyh]/g, "")
    .replace(/(.)\1+/g, "$1");
}

/**
 * Accounts to try for what was typed: an exact English/Sinhala name first;
 * otherwise those whose name sounds the same (the password decides which, if any).
 */
export function loginCandidates<T extends { username?: string | null; username_si?: string | null }>(typed: string, rows: T[]) {
  const exact = rows.filter((r) => loginNameMatches(typed, r));
  if (exact.length) return exact;
  const want = loginSkeleton(typed);
  if (want.length < 2) return [];
  return rows.filter((r) => [r.username, r.username_si].some((n) => !!n && loginSkeleton(n) === want)).slice(0, 5);
}

/** Accounts don't use a real email; Supabase gets this never-mailed address. */
export function internalEmail() {
  return `u-${crypto.randomUUID()}@users.kurunduwatta.invalid`;
}
