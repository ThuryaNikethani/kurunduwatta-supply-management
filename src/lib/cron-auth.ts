import type { NextRequest } from "next/server";

/** Vercel Cron sends "Authorization: Bearer <CRON_SECRET>". */
export function isCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}
