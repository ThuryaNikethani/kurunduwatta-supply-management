import { NextResponse, type NextRequest } from "next/server";
import { adminClient, callerProfile } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/**
 * Links this phone/browser's push subscription to the signed-in user.
 * If someone else used the same device before, it moves to the new user.
 * It stays after logout, so popups keep arriving when not signed in.
 */
export async function POST(req: NextRequest) {
  const admin = adminClient();
  if (!admin) return NextResponse.json({ skipped: true });

  const caller = await callerProfile(admin, req.headers.get("authorization"));
  if (!caller) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const sub = (await req.json().catch(() => null)) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | null;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth)
    return NextResponse.json({ error: "invalid subscription" }, { status: 400 });

  const { error } = await admin
    .from("push_subscriptions")
    .upsert({ endpoint: sub.endpoint, user_id: caller.uid, subscription: sub }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
