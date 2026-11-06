import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getAdminApp } from "@/lib/firebase-admin";

export const runtime = "nodejs";

/** Sends a push notification to the given users' registered devices. */
export async function POST(req: NextRequest) {
  const app = getAdminApp();
  if (!app) return NextResponse.json({ skipped: "push not configured" });

  const idToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!idToken) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  let callerUid: string;
  try {
    callerUid = (await getAuth(app).verifyIdToken(idToken)).uid;
  } catch {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const db = getFirestore(app);
  const caller = await db.doc(`users/${callerUid}`).get();
  if (!caller.exists || caller.data()?.active === false)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { uids, title, body, link } = (await req.json()) as {
    uids: string[];
    title: string;
    body: string;
    link: string;
  };
  if (!Array.isArray(uids) || !uids.length) return NextResponse.json({ sent: 0 });

  const owners = new Map<string, string>(); // token -> uid
  const snaps = await db.getAll(...uids.slice(0, 50).map((u) => db.doc(`users/${u}`)));
  for (const s of snaps) for (const tok of (s.data()?.fcmTokens as string[]) ?? []) owners.set(tok, s.id);
  const tokens = [...owners.keys()];
  if (!tokens.length) return NextResponse.json({ sent: 0 });

  const url = new URL(link || "/dashboard", req.nextUrl.origin).toString();
  const res = await getMessaging(app).sendEachForMulticast({
    tokens,
    notification: { title: String(title).slice(0, 200), body: String(body).slice(0, 500) },
    data: { link: url },
    webpush: { fcmOptions: { link: url }, notification: { icon: "/icons/192" } },
  });

  // Forget tokens for devices that uninstalled or revoked permission.
  const stale = res.responses
    .map((r, i) => (!r.success && /registration-token-not-registered|invalid-argument/.test(r.error?.code ?? "") ? tokens[i] : null))
    .filter((t): t is string => !!t);
  await Promise.all(
    stale.map((t) => db.doc(`users/${owners.get(t)}`).update({ fcmTokens: FieldValue.arrayRemove(t) })),
  );

  return NextResponse.json({ sent: res.successCount, failed: res.failureCount });
}
