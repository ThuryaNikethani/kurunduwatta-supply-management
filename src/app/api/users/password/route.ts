import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { adminClient, callerProfile } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const input = z.object({ uid: z.string().uuid(), password: z.string().min(6) });

/** HR sets a new password for a staff member who forgot theirs. */
export async function POST(req: NextRequest) {
  const admin = adminClient();
  if (!admin) return NextResponse.json({ error: "not configured" }, { status: 500 });

  const caller = await callerProfile(admin, req.headers.get("authorization"));
  if (!caller) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  if (caller.role !== "hr") return NextResponse.json({ error: "permission denied", code: "permission" }, { status: 403 });

  const parsed = input.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });

  const { data: target } = await admin.from("profiles").select("id").eq("id", parsed.data.uid).maybeSingle();
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { error } = await admin.auth.admin.updateUserById(parsed.data.uid, { password: parsed.data.password });
  if (error) return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
  return NextResponse.json({ ok: true });
}
