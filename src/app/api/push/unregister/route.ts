import { NextResponse, type NextRequest } from "next/server";
import { adminClient, callerProfile } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/** Stop the signed-in user's popups on this one device (others on it keep theirs). */
export async function POST(req: NextRequest) {
  const admin = adminClient();
  if (!admin) return NextResponse.json({ skipped: true });

  const caller = await callerProfile(admin, req.headers.get("authorization"));
  if (!caller) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (!endpoint) return NextResponse.json({ error: "missing endpoint" }, { status: 400 });

  const { error } = await admin.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", caller.uid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
