import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { newUserSchema } from "@/lib/schemas";
import { adminClient, callerProfile, usernameTaken } from "@/lib/supabase-admin";
import { ROLES } from "@/lib/types";
import { internalEmail } from "@/lib/username";

export const runtime = "nodejs";

const input = newUserSchema.extend({ role: z.enum(ROLES) });

/** HR creates a new account (chef, supervisor or HR). */
export async function POST(req: NextRequest) {
  const admin = adminClient();
  if (!admin) return NextResponse.json({ error: "not configured" }, { status: 500 });

  const caller = await callerProfile(admin, req.headers.get("authorization"));
  if (!caller) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  if (caller.role !== "hr") return NextResponse.json({ error: "permission denied", code: "permission" }, { status: 403 });

  const parsed = input.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });

  const { name, username, password, role } = parsed.data;
  if (await usernameTaken(admin, username))
    return NextResponse.json({ error: "username-taken", code: "username-taken" }, { status: 400 });

  // No real email: Supabase gets an internal address that is never mailed.
  const email = internalEmail();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) return NextResponse.json({ error: error?.message ?? "failed", code: error?.code }, { status: 400 });

  const { error: pErr } = await admin.from("profiles").insert({ id: data.user.id, name, username: username.normalize("NFC"), email, role, active: true });
  if (pErr) {
    await admin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
