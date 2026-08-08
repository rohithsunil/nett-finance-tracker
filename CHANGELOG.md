# Nett release notes

## 1.4.0 — 2026-08-08 — Country-aware monthly money view

GitHub commit: `pending`

- Added visible FX context with a selectable comparison currency and conversion rate source.
- Added mobile country, workspace and total-currency controls for UAE, India and combined views.
- Added month-scoped expense summaries for expenses, income and net cash flow.
- Added account editing, masked last-four digits, institution details and optional logo URLs.
- Fixed duplicate mobile headers, safe-area spacing and dark/AMOLED contrast.

## 1.2.2 — 2026-08-08 — Email confirmation handoff

GitHub commit: [`f5a6220`](https://github.com/rohithsunil/nett-finance-tracker/commit/f5a6220)

- Redirected successful email confirmations to login with an “Email verified” notification.
- Handled expired or already-used confirmation links with a helpful login message.
- Added compatibility for older confirmation links that land on `/?code=...`.

## 1.2.1 — 2026-08-08 — Signup entry fix

GitHub commit: [`c1393a2`](https://github.com/rohithsunil/nett-finance-tracker/commit/c1393a2)

- Fixed the `/login?mode=signup` redirect so new visitors see the signup form instead of sign in.

## 1.2.0 — 2026-08-08 — Lotus brand release

GitHub commit: [`fa3892b`](https://github.com/rohithsunil/nett-finance-tracker/commit/fa3892b)

- Replaced the placeholder Nett mark with the lotus brand asset across auth, onboarding, loading and desktop surfaces.
- Added the lotus as favicon, Apple Home Screen icon, PWA icon and notification artwork.
- Documented the independent Vercel + Supabase deployment setup and environment-variable locations.

## 1.1.0 — 2026-08-08 — Ready for real users

GitHub commit: [`cc91d4c`](https://github.com/rohithsunil/nett-finance-tracker/commit/cc91d4c)

- Unauthenticated visitors are sent to account creation instead of seeing shared demo balances.
- New accounts receive a first-run setup flow for profile, currency and first account.
- Authenticated sessions load only the user’s Supabase records; demo fixtures are not an authenticated fallback.
- Added a deployment configuration screen when Supabase public environment variables are missing.
- Replaced the placeholder Nett mark with the lotus brand asset across browser, PWA and app surfaces.
- Added a public `/changelog` page and release metadata.

## 1.0.0 — 2026-08-07 — Initial MVP foundation

GitHub commit: [`f57322d`](https://github.com/rohithsunil/nett-finance-tracker/commit/f57322d)

- Added the Nett dashboard, accounts, activity, plan and settings surfaces.
- Added Supabase ownership policies, snapshots, notification subscriptions and keep-alive workflow.
- Added installable PWA scaffolding and Web Push subscription flow.
