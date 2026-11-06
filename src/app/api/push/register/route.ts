import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";

export const runtime = "nodejs";

/**
 * Links this device's push token to the signed-in user only. If someone else
 * used the same phone before, the token is removed from their profile so
 * they don't get this user's notifications.
 * The token stays registered after logout, so push keeps arriving even when
 * the person is not signed in or the app is closed.
 */
export async function POST(req: NextRequest) {
  const app = getAdminApp();
  if (!app) return NextResponse.json({ skipped: true });

  const idToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  let uid: string;
  try {
    uid = (await getAuth(app).verifyIdToken(idToken ?? "")).uid;
  } catch {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const { token } = (await req.json()) as { token?: string };
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 400 });

  const db = getFirestore(app);
  const others = await db.collection("users").where("fcmTokens", "array-contains", token).get();
  const batch = db.batch();
  for (const d of others.docs)
    if (d.id !== uid) batch.update(d.ref, { fcmTokens: FieldValue.arrayRemove(token) });
  batch.update(db.doc(`users/${uid}`), { fcmTokens: FieldValue.arrayUnion(token) });
  await batch.commit();
  return NextResponse.json({ ok: true });
}
