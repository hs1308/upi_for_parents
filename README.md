# UPI for Mom

A simple website so someone who isn't comfortable with UPI apps can ask a
trusted person (like their kid) to pay a QR code / UPI ID for them.

## How it works
1. The **requester** (e.g. mom) picks a friend's photo on the home screen.
2. Her camera opens, she photographs the QR code / UPI ID and types the amount.
3. The **payer** (e.g. you) gets the request on the "Requests" tab, taps
   **Pay now** (opens your UPI apps via the `upi://pay` link), pays, then
   marks it paid and optionally attaches a screenshot.
4. The requester sees the confirmation (and screenshot) on "Sent", ready to
   show the merchant.

## Tech stack
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth + Storage + Realtime) — project: **Hospital Voice Bot**
  (all tables/buckets are prefixed `upi_` / `upi-` so they don't collide with
  other projects in the same Supabase instance)
- `jsqr` to read UPI QR codes client-side from the captured photo
- Deploy target: Vercel

## Local setup
```bash
cd D:\Vibes\UPI_for_mom
npm install
npm run dev
```
Then open http://localhost:3000. `.env.local` is already filled in with the
Supabase URL and anon key, so it should just work.

> Open it on your phone (same wifi network, use your computer's local IP
> instead of localhost) to test the camera capture — it needs a real camera,
> which most desktop browsers don't have in a useful way for this flow.

## Database
Already created in your Supabase project (Hospital Voice Bot):
- `upi_profiles` — one row per user (username, display name, photo)
- `upi_friendships` — friend requests / accepted friends
- `upi_payment_requests` — the core request → pay → confirm flow
- Storage buckets: `upi-qr-images`, `upi-proofs`, `upi-avatars` (all public,
  since screenshots need to be easily shown/shared)

All tables have row-level security so people can only see friendships and
requests they're actually part of.

## Known limitations (MVP)
- **Login** is username + password (mapped internally to a fake email for
  Supabase Auth) rather than phone + OTP — easy to add later.
- **"Pay now"** uses a `upi://pay` deep link. This reliably opens the UPI
  app chooser on Android Chrome. iOS Safari's support for UPI deep links is
  inconsistent — worth testing on your dad's/mom's actual phones.
- **Notifications** are in-app only for now (the Requests tab live-updates
  via Supabase Realtime while open, but there's no push/SMS ping if the app
  isn't open). A loud lock-screen-style alert would need a native app or
  push notifications — good next step.
- No actual UPI payment license/integration — you still pay through your own
  UPI apps, this just removes the "send me the QR on WhatsApp" friction.

## Deploying (GitHub + Vercel)
```bash
cd D:\Vibes\UPI_for_mom
git init
git add .
git commit -m "Initial UPI for Mom app"
gh repo create upi-for-mom --private --source=. --push
```
Then in Vercel: **New Project → import the repo**, and add these two
environment variables (same values as `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Deploy, and it's live.

## Suggested next steps
1. Test the whole flow end-to-end with a real QR code on your own phone.
2. Swap login to phone + OTP once you're ready to add an SMS provider.
3. Add web push notifications for "you have a new request".
4. Eventually: a native app + UPI license for direct in-app payment.
