import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Weekly backups: every table is saved as one JSON file in a private
 * Supabase Storage bucket. Only the server (secret key) can read it;
 * HR downloads through /api/backups.
 */

export const BUCKET = "backups";
const KEEP = 12; // about three months of weekly backups

// Device push keys are left out: they are sensitive and phones re-register by themselves.
const TABLES = [
  "profiles",
  "app_meta",
  "recipes",
  "supply_lists",
  "transfer_outs",
  "notifications",
  "stock_items",
  "stock_moves",
  "stock_issues",
  "purchase_orders",
];

async function allRows(admin: SupabaseClient, table: string) {
  const rows: unknown[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from(table).select("*").range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

async function ensureBucket(admin: SupabaseClient) {
  const { data } = await admin.storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await admin.storage.createBucket(BUCKET, { public: false });
    if (error && !/already exists/i.test(error.message)) throw error;
  }
}

/** Take a backup now and drop the oldest beyond KEEP. Returns the file name. */
export async function runBackup(admin: SupabaseClient, by: string) {
  await ensureBucket(admin);
  const tables: Record<string, unknown[]> = {};
  for (const t of TABLES) tables[t] = await allRows(admin, t);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const name = `backup-${stamp}.json`;
  const body = JSON.stringify({ createdAt: Date.now(), by, tables });
  const { error } = await admin.storage.from(BUCKET).upload(name, body, { contentType: "application/json", upsert: false });
  if (error) throw error;

  const files = await listBackups(admin);
  const old = files.slice(KEEP).map((f) => f.name);
  if (old.length) await admin.storage.from(BUCKET).remove(old);
  return { name, rows: Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length])) };
}

/** Newest first. */
export async function listBackups(admin: SupabaseClient) {
  await ensureBucket(admin);
  const { data, error } = await admin.storage.from(BUCKET).list("", { limit: 100, sortBy: { column: "name", order: "desc" } });
  if (error) throw error;
  return (data ?? [])
    .filter((f) => f.name.startsWith("backup-"))
    .map((f) => ({ name: f.name, size: (f.metadata as { size?: number } | null)?.size ?? 0, createdAt: f.created_at }));
}
