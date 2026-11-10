import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);

/** Browser client (publishable key). Row Level Security protects the data. */
export const supabase = createClient(
  supabaseConfigured ? supabaseUrl : "http://localhost",
  supabaseConfigured ? supabaseKey : "missing",
  { auth: { persistSession: true, autoRefreshToken: true } },
);

/** Access token of the signed-in user, for calling our own API routes. */
export async function accessToken() {
  return (await supabase.auth.getSession()).data.session?.access_token ?? "";
}

/** camelCase ⇄ snake_case for top-level keys of a row. */
export function toRow(obj: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "id" && v === undefined) continue;
    out[k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)] = v;
  }
  return out;
}

export function fromRow<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = v;
  return out as T;
}
