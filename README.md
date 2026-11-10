# Kurunduwatta Supply Management

Kitchen supply approval system for Kurunduwatta Villa. Three roles (**Chef**, **Supervisor**, **HR**) with
real-time notifications and phone/computer popups. The whole app is in simple Sinhala and works on phone and
computer.

## How it works

### 1. Supply list (ingredient list)

1. **Chef** creates a list and chooses who it is for: **guests** or **villa staff**. Then the name, date, meal,
   number of people and the dishes. Quantities are calculated from the per-person recipe
   (e.g. dhal 300 g × 10 people = 3 kg). The chef can change any quantity and write a reason.
2. **Supervisor** gets a notification and reviews the list.
   - Wrong? **Return to Chef** with a reason.
   - The chef can fix it, or resend unchanged with a note explaining why.
3. When happy, the **Supervisor sends it to HR** (optionally with a note).
4. **HR approves** it (final approval) or **returns it to the Supervisor** with a reason.

### 2. Leftovers given to staff

After the meal, if food is left over (e.g. enough for 3 more people), the chef records it on the approved list:
which dishes, enough for how many people, and the names of the staff who received it. This goes through the
same Chef → Supervisor → HR approval.

Every step is saved in the history with who did it, when, and the note. Lists can be printed or saved as PDF.

## Tech

- Next.js 15, Tailwind CSS 4, shadcn/ui, Zod (same look as kurunduwatta-hospitality.vercel.app)
- **Supabase**: login, PostgreSQL database, Row Level Security, Realtime
- **Web Push (VAPID)** for popups when the app is closed or the user is logged out (free, no extra service)
- Installable as a phone app (PWA), hosted on Vercel

## Setup

1. Create a free project at <https://supabase.com>.
2. In the Supabase dashboard open **SQL Editor → New query**, paste [`supabase/schema.sql`](supabase/schema.sql)
   and press **Run**. This creates the tables, security rules and live updates.
3. Copy `.env.local.example` to `.env.local` and fill in:
   - Project URL and **publishable** key (Project Settings → Data API / API Keys)
   - **Secret** key (server only)
   - VAPID keys: `npx web-push generate-vapid-keys`
4. Run locally:
   ```bash
   npm install
   npm run dev
   ```
   Open <http://localhost:3000/setup> once to create the **first HR account**.
5. HR signs in → **ගිණුම්** (accounts) → add the Chef and Supervisor accounts.
6. Chef → **කෑම වට්ටෝරු** (recipes) → **විලා මෙනුව ගන්න**, then add per-person ingredients for each dish.

To try the app without a database, set `NEXT_PUBLIC_BACKEND=demo` (data stays in the browser).

## Deploy to Vercel

1. Import this GitHub repo in Vercel.
2. Add the same environment variables from `.env.local` in *Project → Settings → Environment Variables*.
3. Deploy.

## Phone popups

Each person taps **පණිවිඩ එන්න දාන්න** once on each phone or computer. After that, popups arrive even when the
app is closed or they are logged out.
On iPhone, first add the site to the Home Screen (Share → Add to Home Screen) and open it from there.
