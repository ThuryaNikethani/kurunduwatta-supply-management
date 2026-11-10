import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { adminClient, callerProfile } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/** Sends a Sinhala popup to every registered device of the given users. */
export async function POST(req: NextRequest) {
  const admin = adminClient();
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!admin || !publicKey || !privateKey) return NextResponse.json({ skipped: "push not configured" });

  const caller = await callerProfile(admin, req.headers.get("authorization"));
  if (!caller) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const { uids, title, body, link } = (await req.json().catch(() => ({}))) as {
    uids?: string[];
    title?: string;
    body?: string;
    link?: string;
  };
  if (!Array.isArray(uids) || !uids.length) return NextResponse.json({ sent: 0 });

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("endpoint, subscription, user_id")
    .in("user_id", uids.slice(0, 100));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Name each popup for its person, so shared phones show who it is for.
  const { data: people } = await admin.from("profiles").select("id, name").in("id", uids.slice(0, 100));
  const nameOf = Object.fromEntries((people ?? []).map((p) => [p.id as string, p.name as string]));

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", publicKey, privateKey);
  const payloadFor = (uid: string) =>
    JSON.stringify({
      title: `${String(title ?? "").slice(0, 100)}${nameOf[uid] ? ` · ${nameOf[uid]}ට` : ""}`,
      body: String(body ?? "").slice(0, 400),
      link: link || "/dashboard",
      tag: `${link || "kw"}:${uid}`,
    });

  let sent = 0;
  const stale: string[] = [];
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(s.subscription as webpush.PushSubscription, payloadFor(s.user_id as string), {
          TTL: 60 * 60 * 24,
        });
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) stale.push(s.endpoint as string); // device unsubscribed
      }
    }),
  );
  if (stale.length) await admin.from("push_subscriptions").delete().in("endpoint", [...new Set(stale)]);

  return NextResponse.json({ sent, removed: stale.length });
}
