import { cert, getApps, initializeApp, type App } from "firebase-admin/app";

/**
 * Server-side Firebase (used only to send push notifications).
 * Needs FIREBASE_SERVICE_ACCOUNT = the service-account JSON on one line.
 * Returns null when not configured so push is simply skipped.
 */
export function getAdminApp(): App | null {
  if (getApps().length) return getApps()[0]!;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw);
    if (typeof sa.private_key === "string") sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    return initializeApp({ credential: cert(sa) });
  } catch (e) {
    console.error("Invalid FIREBASE_SERVICE_ACCOUNT", e);
    return null;
  }
}
