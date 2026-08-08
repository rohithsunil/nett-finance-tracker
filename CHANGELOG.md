# Nett release notes

## 1.1.0 — 2026-08-08 — Ready for real users

GitHub commit: [`cc91d4c`](https://github.com/rohithsunil/nett-finance-tracker/commit/cc91d4c)

- Unauthenticated visitors are sent to account creation instead of seeing shared demo balances.
- New accounts receive a first-run setup flow for profile, currency and first account.
- Authenticated sessions load only the user’s Supabase records; demo fixtures are not an authenticated fallback.
- Added a deployment configuration screen when Supabase public environment variables are missing.
- Added a public `/changelog` page and release metadata.

## 1.0.0 — 2026-08-07 — Initial MVP foundation

GitHub commit: [`f57322d`](https://github.com/rohithsunil/nett-finance-tracker/commit/f57322d)

- Added the Nett dashboard, accounts, activity, plan and settings surfaces.
- Added Supabase ownership policies, snapshots, notification subscriptions and keep-alive workflow.
- Added installable PWA scaffolding and Web Push subscription flow.
