import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { loginSchema } from "@/lib/schemas";
import { adminClient } from "@/lib/supabase-admin";
import { usernameKey } from "@/lib/username";

export const runtime = "nodejs";

/**
 * Log in with a username. Supabase only knows emails, so find the account's
 * internal email here (it never reaches the browser) and return the session.
 */
export async function POST(req: NextRequest) {
  const admin = adminClient();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!admin || !url || !key) return NextResponse.json({ error: "not configured" }, { status: 500 });

  const parsed = loginSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });

  // Same answer for an unknown name and a wrong password.
  const denied = NextResponse.json({ error: "invalid-credential", code: "invalid-credential" }, { status: 400 });
  const { data: rows, error } = await admin.from("profiles").select("email, username");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const want = usernameKey(parsed.data.username);
  const row = rows?.find((r) => usernameKey(r.username) === want);
  if (!row) return denied;

  const auth = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error: signInError } = await auth.auth.signInWithPassword({ email: row.email, password: parsed.data.password });
  if (signInError || !data.session) return denied;
  return NextResponse.json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
}
