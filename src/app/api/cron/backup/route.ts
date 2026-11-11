import { NextResponse, type NextRequest } from "next/server";
import { runBackup } from "@/lib/backup-server";
import { isCron } from "@/lib/cron-auth";
import { adminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Weekly automatic backup (vercel.json). */
export async function GET(req: NextRequest) {
  if (!isCron(req)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const admin = adminClient();
  if (!admin) return NextResponse.json({ error: "not configured" }, { status: 500 });
  try {
    return NextResponse.json({ ok: true, ...(await runBackup(admin, "auto")) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
