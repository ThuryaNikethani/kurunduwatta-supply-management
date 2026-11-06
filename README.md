# Kurunduwatta Supply Management

Kitchen supply approval system for Kurunduwatta Villa. Three roles (**Chef**, **Supervisor**, **HR**) with
real-time notifications, in English and Sinhala, usable on phone and computer.

## How it works

### 1. Supply list (ingredient list for a guest booking)

1. **Chef** creates a list: guest/booking name, date, meal, number of guests and the dishes the guests ordered.
   Quantities are calculated from the per-person recipe (e.g. dhal 300 g × 10 guests = 3 kg). The chef can change
   any quantity and write a reason.
2. **Supervisor** gets a notification and reviews the list.
   - Wrong? **Return to Chef** with a reason.
   - The chef can fix it, or resend unchanged with a note explaining why.
3. When happy, the **Supervisor sends it to HR** (optionally with a note).
4. **HR approves** it (final approval) or **returns it to the Supervisor** with a reason.

### 2. Leftovers given to staff (transfer out)

After the meal, if food is left over (e.g. enough for 3 more people), the chef records it on the approved list:
which dishes, enough for how many people, and the names of the staff who received it. This goes through the
same Chef → Supervisor → HR approval.

Every step is saved in the history with who did it, when, and the note.

## Tech

- Next.js 15 + Tailwind CSS 4 (same theme as kurunduwatta-hospitality.vercel.app)
- Firebase Authentication, Cloud Firestore (real-time), Cloud Messaging (push notifications)
- Installable as a phone app (PWA), hosted on Vercel

## Setup

1. **Create a Firebase project** at <https://console.firebase.google.com>.
   - *Build → Authentication → Sign-in method*: enable **Email/Password**.
   - *Build → Firestore Database*: create a database.
   - *Firestore → Rules*: paste the contents of [`firestore.rules`](firestore.rules) and publish.
   - *Project settings → General*: add a **Web app** and copy its config.
   - *Project settings → Cloud Messaging → Web Push certificates*: generate a key pair (VAPID key).
   - *Project settings → Service accounts*: generate a private key (JSON) for push notifications.
2. Copy `.env.local.example` to `.env.local` and fill in the values.
3. Run locally:
   ```bash
   npm install
   npm run dev
   ```
   Open <http://localhost:3000/setup> once to create the **first HR account**.
4. HR signs in → **Users** → add the Chef and Supervisor accounts.
5. Chef → **Recipes** → **Load villa menu**, then add per-person ingredients for each dish.

## Deploy to Vercel

1. Import this GitHub repo in Vercel.
2. Add the same environment variables from `.env.local` in *Project → Settings → Environment Variables*.
3. Deploy. In Firebase *Authentication → Settings → Authorized domains*, add your Vercel domain.

## Phone notifications

Each user opens **Notifications → Turn on phone notifications** on each device once.
On iPhone, first add the site to the Home Screen (Share → Add to Home Screen), then open it from there.
While the app is open, notifications also appear inside the app instantly.
