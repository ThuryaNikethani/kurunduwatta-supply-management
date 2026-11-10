import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "./types";

/**
 * Server-only Supabase client using the secret key (bypasses RLS).
 * Never import this from a client component.
 */
export function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** The signed-in, active user who called an API route, or null. */
export async function callerProfile(admin: SupabaseClient, authHeader: string | null): Promise<UserProfile | null> {
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: row } = await admin.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
  if (!row || !row.active) return null;
  return { uid: row.id, name: row.name, email: row.email, role: row.role, active: row.active, createdAt: row.created_at };
}
