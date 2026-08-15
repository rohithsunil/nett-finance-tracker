# Nett release notes

## 1.14.0 - 2026-08-15 - Recurring rhythm, forecast and budget control

GitHub commit: [`7a9b467`](https://github.com/rohithsunil/nett-finance-tracker/commit/7a9b467)

- Added a first-class Recurring page for salary, rent, insurance and subscriptions, with monthly income/outgoing totals and edit/delete controls.
- Added a saved Forecast page with 3, 6, 12 and 24 month horizons, annual growth, recurring and one-time commitment projection, accessible trajectory values and scenario impact.
- Added persisted forecast scenarios for expenses, income and new debt without altering live balances.
- Added a monthly Budget page with planned lines, month navigation, planned versus actual savings, variance and actual activity linked to the existing transaction ledger.
- Added Supabase migration 0004 with user-scoped RLS tables for forecast scenarios and budget lines, plus mobile planning shortcuts and responsive card layouts.

## 1.13.0 - 2026-08-15 - Reference ledgers across the app

GitHub commit: [`869fc4b`](https://github.com/rohithsunil/nett-finance-tracker/commit/869fc4b)

- Rebuilt Loans as a two-column card grid with repayment progress, outstanding balance, due date, scoped Log payment and Add to loan actions.
- Added a real loan ledger with persistent borrowing and repayment events, edit/delete controls, full-history expansion and account balance reconciliation.
- Rebuilt Spends as purpose-led cost tracker cards with category breakdowns, lifetime cost, cashback, recent entries and a correctly scoped Add entry action.
- Rebuilt Upcoming bills as responsive cards with recurrence, due status, amount, notes and always-visible edit/delete controls.
- Kept the layouts aligned, neutral and touch-friendly across light, dark, AMOLED, desktop browser and installed PWA surfaces.

## 1.12.0 - 2026-08-15 - Pot ledger repair

GitHub commit: [`7d89ef6`](https://github.com/rohithsunil/nett-finance-tracker/commit/7d89ef6)

- Scoped Add entry to the selected pot so new expenses and income appear in the correct ledger immediately.
- Added readable ledger rows with dates, categories, direction, amounts and compact entry actions.
- Added edit and delete flows for ordinary ledger entries, including account estimate restoration when an entry changes or is removed.
- Kept debt-linked ledger rows protected from accidental double-accounting; loan events remain managed from Loans.
- Improved mobile ledger wrapping so amounts and actions remain tappable without crowding the card.

## 1.11.1 - 2026-08-15 - Reference card designs

GitHub commit: [`b2b8d49`](https://github.com/rohithsunil/nett-finance-tracker/commit/b2b8d49)

- Restored the net-worth amount and currency hierarchy from the reference card, with the currency suffix aligned to the value baseline.
- Added the clipped concentric rings to Safe to Spend and kept its progress bar, protected amount and free percentage balanced inside the card.
- Kept both cards readable at tablet widths and visually consistent in dark and AMOLED themes.

## 1.11.0 - 2026-08-15 - Aligned cockpit and decision check

GitHub commit: [`ac7fe06`](https://github.com/rohithsunil/nett-finance-tracker/commit/ac7fe06)

- Rebuilt the desktop net-worth and Safe to Spend cards with aligned heights, clearer hierarchy, balanced spacing and dark/AMOLED support.
- Removed the dashboard width cap that left a large unused area on the right side of wide browser windows.
- Restored the temporary What-If decision check on desktop and mobile so a planned expense shows its safe-to-spend and net-worth impact.
- Raised dashboard supporting copy and summary details to a readable 14px baseline while preserving display-size financial values.
- Reflowed the cockpit at tablet widths so the main decisions stay aligned instead of becoming cramped side-by-side panels.

## 1.10.0 - 2026-08-15 - Personalized view controls

GitHub commit: [`3a0466f`](https://github.com/rohithsunil/nett-finance-tracker/commit/3a0466f)

- Moved workspace, country and totals-currency controls out of the desktop sidebar into page-level controls.
- Added per-user Settings controls to show or hide countries and currencies, with UAE, India, AED and INR enabled by default.
- Replaced emoji country markers with consistent inline SVG flags and replaced the currency comparison dropdown with button chips.
- Raised supporting desktop text and touch-target labels to a 14px minimum while preserving hierarchy for headings and financial values.
- Added Supabase migration 0003 so country and currency visibility choices persist across devices.

## 1.6.0 - 2026-08-14 - Focused finance workspace

GitHub commit: [`fc46578`](https://github.com/rohithsunil/nett-finance-tracker/commit/fc46578)

- Reworked Plan into focused Overview, Debts & loans, Future costs, Owed to you and Spaces sections.
- Added clearer debt progress, partial-payment entry points, commitment management, reserve progress and Space edit/delete controls.
- Replaced stacked mobile context selects with a compact workspace, country and total-currency sheet.
- Limited the FX rate banner to Home and Accounts and polished safe-area, bottom navigation and dark/AMOLED surfaces.

## 1.5.1 - 2026-08-09 - Plan item controls

GitHub commit: [`33872fe`](https://github.com/rohithsunil/nett-finance-tracker/commit/33872fe)

- Added clear Edit and Delete actions for every debt, loan and future commitment.
- Added confirmation dialogs before removing plan items.
- Persisted plan edits and deletions to the signed-in Supabase user account.

## 1.5.0 - 2026-08-08 - Connected money control centre

GitHub commit: [`6dbfde7`](https://github.com/rohithsunil/nett-finance-tracker/commit/6dbfde7)

- Added a visible account-card delete action with a confirmation flow and PWA cache refresh.
- Added editable credit-card limits, balances, statement dates, minimum payments and due dates.
- Added Space-focused activity filters and linked ledger summaries for Car, Business and other purposes.
- Linked additional debt borrowing and repayments into a selected Space without double-counting cash or net worth.

## 1.4.4 — 2026-08-08 — Account deletion controls

GitHub commit: [`ceab314`](https://github.com/rohithsunil/nett-finance-tracker/commit/ceab314)

- Added a Delete account action to the Edit account flow with an explicit confirmation step.
- Removed the account and its linked activity, snapshots and card details from the signed-in user’s Nett data.
- Kept linked debts and receivables intact while clearing their account relationship.

## 1.4.3 — 2026-08-08 — Accounts clarity pass

GitHub commit: [`0fbd523`](https://github.com/rohithsunil/nett-finance-tracker/commit/0fbd523)

- Removed repeated per-account FX rate labels; the FX context bar is now the single source of truth.
- Reworked account cards with clearer identity, country, local balance, converted amount and actions.
- Removed the duplicate Accounts heading and added a compact account-context row.

## 1.4.2 — 2026-08-08 — Space management fix

GitHub commit: [`58cf282`](https://github.com/rohithsunil/nett-finance-tracker/commit/58cf282)

- Added Edit and Delete actions for Spaces on the Plan screen.
- Added a delete confirmation; linked transactions remain in Activity while the Space is archived.
- Added persisted edits for Space details and corrected workspace scoping.

## 1.4.1 — 2026-08-08 — Country transfer & trust polish

GitHub commit: [`3902120`](https://github.com/rohithsunil/nett-finance-tracker/commit/3902120)

- Added a dedicated Move country action on every account with a confirmation explaining how linked activity follows the account.
- Made negative Safe to Spend states explicit instead of presenting them as a normal available balance.
- Improved empty monthly activity guidance for both expenses and income.

## 1.4.0 — 2026-08-08 — Country-aware monthly money view

GitHub commit: [`e7de8d1`](https://github.com/rohithsunil/nett-finance-tracker/commit/e7de8d1)

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
