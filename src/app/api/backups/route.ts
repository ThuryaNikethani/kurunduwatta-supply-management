import { NextResponse, type NextRequest } from "next/server";
import { BUCKET, listBackups, runBackup } from "@/lib/backup-server";
import { adminClient, callerProfile } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function hrOnly(req: NextRequest) {
  const admin = adminClient();
  if (!admin) return { error: NextResponse.json({ error: "not configured" }, { status: 500 }) };
  const caller = await callerProfile(admin, req.headers.get("authorization"));
  if (!caller) return { error: NextResponse.json({ error: "unauthorised" }, { status: 401 }) };
  if (caller.role !== "hr") return { error: NextResponse.json({ error: "permission denied", code: "permission" }, { status: 403 }) };
  return { admin, caller };
}

/** HR: list backups, or get a short-lived download link with ?download=<name>. */
export async function GET(req: NextRequest) {
  const r = await hrOnly(req);
  if (r.error) return r.error;
  const name = req.nextUrl.searchParams.get("download");
  if (name) {
    if (!/^backup-[\w-]+\.json$/.test(name)) return NextResponse.json({ error: "bad name" }, { status: 400 });
    const { data, error } = await r.admin.storage.from(BUCKET).createSignedUrl(name, 60, { download: name });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ url: data.signedUrl });
  }
  try {
    return NextResponse.json({ backups: await listBackups(r.admin) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** HR: take a backup now. */
export async function POST(req: NextRequest) {
  const r = await hrOnly(req);
  if (r.error) return r.error;
  try {
    return NextResponse.json({ ok: true, ...(await runBackup(r.admin, r.caller.name)) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
