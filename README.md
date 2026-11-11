# Kurunduwatta Supply Management

Kitchen supply, stock and approval system for Kurunduwatta Villa. Three roles — **Chef**, **Supervisor**,
**HR** — with live updates and phone/computer popups. The whole interface is in simple Sinhala and works on
phones and computers (installable as an app).

Live: <https://kurunduwatta-supply-management.vercel.app>

## What it does

### Supply lists (බඩු ලැයිස්තු)
1. **Chef** creates a list for **guests** or **villa staff**: name, date, meal, number of people and dishes.
   Quantities are worked out from per-person recipes (e.g. dhal 40 g × 10 = 400 g); the chef can change any
   amount and give a reason. Unsent input is kept in the browser, so a refresh doesn't lose it.
2. **Supervisor** reviews it — returns it to the chef with a reason, or sends it to HR.
3. **HR** approves it, or returns it to the supervisor with a reason.
4. After approval the **Supervisor issues it from stock** (once). Anything short can go straight into a purchase order.

### Leftovers to staff (ඉතුරු කෑම)
After the meal the chef records leftover dishes, how many people they can feed and which staff received them.
Same Chef → Supervisor → HR approval.

### Stock (ගබඩාව) and purchase orders (ඇණවුම්)
- Stock items with a minimum level ("අඩුයි" when low). Every change is recorded with who, when and why.
- Purchase orders: Supervisor creates (optionally pre-filled from shortages or low stock) → HR approves or
  returns → Supervisor marks it received, which adds it to stock (new items are created).

### Also
- **Recipes** (කෑම වට්ටෝරු): 53 villa menu dishes with starting per-person amounts (estimates). Each recipe
  shows whether the chef has checked it; the chef dashboard reminds them until all are checked.
- **Monthly reports** (වාර්තා): approved lists, people cooked for (guests/staff), leftovers %, average approval
  time, a daily chart, top dishes and total ingredients.
- **Accounts** (ගිණුම්, HR only): add accounts, change roles, disable, reset passwords. Everyone can change
  their own password. First HR account is created once at `/setup`.
- **Popups**: Web Push (VAPID). Arrive when the app is closed or the user is logged out, in Sinhala, named for
  the person. One device can receive popups for several accounts (shared phones); each person can turn theirs
  off on a device. iPhone users see a guide to add the app to the Home Screen first.
- **Print / PDF** on lists, leftovers, orders and reports. Full history (timeline) on every record.
- **Backups**: weekly automatic backup of all data to a private Supabase Storage bucket (last 12 kept);
  HR can take one now and download it from the accounts page.

## Tech

- Next.js 15 (App Router), React 19, Tailwind CSS 4, shadcn/ui, Zod, Lucide icons
- Supabase: Auth, PostgreSQL, Row Level Security, Realtime, Storage
- Web Push with `web-push` (no Firebase)
- Vercel hosting + Vercel Cron

All text lives in [`src/lib/i18n.tsx`](src/lib/i18n.tsx) (Sinhala only) — don't hard-code text in components.
The UI talks to a `Backend` interface ([`src/lib/backend/types.ts`](src/lib/backend/types.ts)) with two
implementations: `supabase` (real) and `demo` (browser-only practice data).

## Setup

1. Create a free project at <https://supabase.com>.
2. In **SQL Editor**, run these files in order:
   1. [`supabase/schema.sql`](supabase/schema.sql) — accounts, recipes, lists, leftovers, notifications, devices
   2. [`supabase/migrations/002_shared_devices.sql`](supabase/migrations/002_shared_devices.sql) *(only for databases created before it was added to the schema)*
   3. [`supabase/migrations/003_recipe_reviewed.sql`](supabase/migrations/003_recipe_reviewed.sql) *(same)*
   4. [`supabase/migrations/004_stock_and_orders.sql`](supabase/migrations/004_stock_and_orders.sql) — stock and purchase orders (always needed)

   All scripts are safe to run again.
3. Copy `.env.local.example` to `.env.local` and fill it in:

   | Variable | Where it comes from |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → Data API |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → API Keys (publishable) |
   | `SUPABASE_SECRET_KEY` | Supabase → API Keys (secret) — **server only** |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` |
   | `VAPID_SUBJECT` | `mailto:` address for the push service |
   | `CRON_SECRET` | any long random string (protects the cron jobs) |
   | `NEXT_PUBLIC_BACKEND` | `supabase` (real) or `demo` (practice data in the browser) |

4. Run locally:
   ```bash
   npm install
   npm run dev
   ```
   Open `/setup` once to create the first HR account. HR then adds the chef and supervisor accounts.
5. Chef → **කෑම වට්ටෝරු** → check and save each recipe. Supervisor → **ගබඩාව** → add current stock.

## Deploy (Vercel)

1. Import the GitHub repo in Vercel (pushes to `main` deploy automatically).
2. Add all the environment variables above in *Project → Settings → Environment Variables*.
3. [`vercel.json`](vercel.json) sets up two cron jobs:
   - `/api/cron/keepalive` — daily; a small database read so the free Supabase project never pauses.
   - `/api/cron/backup` — weekly (Sunday early morning, Sri Lanka time); saves all data to Storage.

## Security notes

- Row Level Security on every table. Each role can only do its own steps; the database itself enforces the
  approval order (`guard_workflow`, `guard_order` triggers), so a modified client can't skip steps.
- Stock amounts can only change through the `stock_change`, `issue_supply` and `receive_order` functions,
  which check the role and record history.
- The secret key, VAPID private key and cron secret are used only in API routes, never in the browser.
- Backups are in a private bucket; downloads use short-lived signed links for HR only. The repo is public, so
  never commit `.env.local` or backup files.

## Development tips

- Test builds can use their own folder so they don't disturb a running dev server:
  `NEXT_DIST_DIR=.next-test npm run build`
- Use demo mode (`NEXT_PUBLIC_BACKEND=demo`) for UI testing so real staff don't get test notifications.
