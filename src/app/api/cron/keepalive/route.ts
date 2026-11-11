import { NextResponse, type NextRequest } from "next/server";
import { isCron } from "@/lib/cron-auth";
import { adminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Runs once a day (vercel.json). A small database read so the free
 * Supabase project never pauses, even when the villa is quiet.
 */
export async function GET(req: NextRequest) {
  if (!isCron(req)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const admin = adminClient();
  if (!admin) return NextResponse.json({ error: "not configured" }, { status: 500 });
  const { count, error } = await admin.from("profiles").select("id", { count: "exact", head: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, accounts: count, at: new Date().toISOString() });
}
