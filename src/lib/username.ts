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

/** Accounts don't use a real email; Supabase gets this never-mailed address. */
export function internalEmail() {
  return `u-${crypto.randomUUID()}@users.kurunduwatta.invalid`;
}
