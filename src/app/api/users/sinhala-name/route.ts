import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { usernameSi } from "@/lib/schemas";
import { adminClient, callerProfile, usernameTaken } from "@/lib/supabase-admin";
import { usernameKey } from "@/lib/username";

export const runtime = "nodejs";

const input = z.object({ uid: z.string().min(1), usernameSi });

/** HR sets (or clears) an account's second login name in Sinhala. */
export async function POST(req: NextRequest) {
  const admin = adminClient();
  if (!admin) return NextResponse.json({ error: "not configured" }, { status: 500 });

  const caller = await callerProfile(admin, req.headers.get("authorization"));
  if (!caller) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  if (caller.role !== "hr") return NextResponse.json({ error: "permission denied", code: "permission" }, { status: 403 });

  const parsed = input.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });
  const name = parsed.data.usernameSi?.trim() || null;

  const { data: row } = await admin.from("profiles").select("*").eq("id", parsed.data.uid).maybeSingle();
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Nobody else may log in with it, and it must differ from the account's own English name.
  if (name && ((await usernameTaken(admin, name, row.id)) || usernameKey(name) === usernameKey(row.username)))
    return NextResponse.json({ error: "username-taken", code: "username-taken" }, { status: 400 });

  const { error } = await admin.from("profiles").update({ username_si: name ? name.normalize("NFC") : null }).eq("id", row.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
