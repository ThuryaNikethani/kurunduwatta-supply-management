import { NextResponse, type NextRequest } from "next/server";
import { newUserSchema } from "@/lib/schemas";
import { adminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/** One-time: create the first HR account. Refused once setup is done. */
export async function POST(req: NextRequest) {
  const admin = adminClient();
  if (!admin) return NextResponse.json({ error: "not configured" }, { status: 500 });

  const parsed = newUserSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });

  // Only allowed while there are no accounts at all.
  const { data: done } = await admin.from("app_meta").select("key").eq("key", "setup").maybeSingle();
  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true });
  if (done || (count ?? 0) > 0) return NextResponse.json({ error: "already-set-up" }, { status: 409 });

  const { name, email, password } = parsed.data;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) return NextResponse.json({ error: error?.message ?? "failed", code: error?.code }, { status: 400 });

  const uid = data.user.id;
  const { error: pErr } = await admin.from("profiles").insert({ id: uid, name, email, role: "hr", active: true });
  if (pErr) {
    await admin.auth.admin.deleteUser(uid);
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }
  await admin.from("app_meta").insert({ key: "setup", value: { by: uid, at: Date.now() } });
  return NextResponse.json({ ok: true });
}
