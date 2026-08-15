export const APP_VERSION = '1.11.0';
export const RELEASE_DATE = '2026-08-15';
export const REPOSITORY_URL = 'https://github.com/rohithsunil/nett-finance-tracker';

export type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  commit: string;
  summary: string;
  changes: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: APP_VERSION,
    date: RELEASE_DATE,
    title: 'Aligned cockpit and decision check',
    commit: 'ac7fe06',
    summary: 'The dashboard now uses the full workspace rail, calmer reference-style cards and a visible What-If check before you spend.',
    changes: [
      'Rebuilt the desktop net-worth and Safe to Spend cards with aligned heights, clearer hierarchy, balanced spacing and dark/AMOLED support.',
      'Removed the dashboard width cap that left a large unused area on the right side of wide browser windows.',
      'Restored the temporary What-If decision check on desktop and mobile so a planned expense shows its safe-to-spend and net-worth impact.',
      'Raised dashboard supporting copy and summary details to a readable 14px baseline while preserving display-size financial values.',
      'Reflowed the cockpit at tablet widths so the main decisions stay aligned instead of becoming cramped side-by-side panels.',
    ],
  },
  {
    version: APP_VERSION,
    date: RELEASE_DATE,
    title: 'Personalized view controls',
    commit: '3a0466f',
    summary: 'Nett now keeps the sidebar focused and puts country, workspace and totals choices where you are using them, with readable type and consistent flag icons across every surface.',
    changes: [
      'Moved workspace, country and totals-currency controls out of the desktop sidebar into page-level controls; Accounts keeps its focused country filter.',
      'Added Settings controls to show or hide countries and currencies per user, with UAE, India, AED and INR enabled by default and browser-local fallback support.',
      'Replaced emoji country markers with reusable inline SVG flags and replaced the currency comparison dropdown with accessible button chips.',
      'Raised supporting desktop text and touch-target labels to a 14px minimum while preserving hierarchy for display headings and financial values.',
      'Added Supabase migration 0003 so country and currency visibility choices persist across devices.',
    ],
  },
  {
    version: '1.9.1',
    date: RELEASE_DATE,
    title: 'Readable desktop and mobile surfaces',
    commit: 'b7df075',
    summary: 'The dashboard now uses the full desktop workspace, the scrollbar fades into the chrome, and mobile controls and supporting copy are easier to read.',
    changes: [
      'Fixed the desktop main flex width so the dashboard no longer shrink-wraps and leave a large unused area on the right.',
      'Replaced the default scrollbar treatment with a thin, quiet track and thumb that stays out of the way of the content.',
      'Raised mobile interactive labels, navigation, filters, metadata and supporting text to a readable 14px minimum while preserving hierarchy for headings and financial values.',
    ],
  },
  {
    version: '1.9.1',
    date: RELEASE_DATE,
    title: 'Native-feeling responsive shell',
    commit: 'c9e07be',
    summary: 'A full UI/UX system pass makes Nett easier to scan, tap and use across compact phones, installed PWA mode, tablets and desktop browsers.',
    changes: [
      'Made the desktop sidebar independently scrollable and kept the main workspace stable across short laptop and large monitor heights.',
      'Standardized 44px touch targets, visible keyboard focus, readable mobile type, safe-area padding and keyboard-friendly forms across shared surfaces.',
      'Reworked mobile sheets and dialogs with modern viewport sizing, a clear drag affordance, sticky actions and Escape/ARIA support.',
      'Removed the portrait-only PWA constraint and refreshed the installed-app scope so landscape and browser experiences behave predictably.',
      'Persisted the Nett UI/UX design direction for future screens without replacing the existing lotus identity or multi-currency finance features.',
    ],
  },
  {
    version: '1.9.1',
    date: RELEASE_DATE,
    title: 'Debit-card account surfaces',
    commit: '83885e4',
    summary: 'Account balances now sit inside calmer debit-card-inspired surfaces that make each bank account easier to scan and manage.',
    changes: [
      'Removed the distracting purple account-card rail and replaced it with a neutral card edge and soft embossed highlight.',
      'Separated account actions into a clear lower footer so Move, Edit and Delete feel intentional instead of crowded into the balance area.',
      'Kept the treatment readable across light, dark and AMOLED themes, including the mobile one-column layout.',
    ],
  },
  {
    version: '1.8.0',
    date: RELEASE_DATE,
    title: 'Reference navigation release',
    commit: 'ea41d7e',
    summary: 'Nett now has a calmer, reference-style information architecture for desktop and mobile, without losing its country-aware finance model.',
    changes: [
      'Added first-class Dashboard, Accounts, Pots, Loans, Holdings, Bills, Spends, Activity and Settings surfaces to the desktop sidebar.',
      'Renamed Banking to Accounts and added a visible country filter so UAE, India and other account groups can be reviewed separately.',
      'Added focused cards and actions for pots, partial loan payments, receivables, holdings, upcoming bills and purpose-led spend trackers using the existing saved data.',
      'Aligned desktop sidebar states, Settings labelling, responsive cards and mobile-safe layouts with the simpler reference interaction model.',
    ],
  },
  {
    version: '1.7.0',
    date: '2026-08-14',
    title: 'Simpler finance cockpit',
    commit: 'ac90512',
    summary: 'Nett now follows a simpler dashboard model inspired by the best personal finance apps, with a calm mobile home and a clearer desktop cockpit.',
    changes: [
      'Rebuilt the mobile Home screen around one net-worth card, income and expense summaries, overview shortcuts, recent activity and upcoming items.',
      'Reduced the mobile app shell to four predictable destinations: Home, Activity, Banking and Account, while keeping Plan reachable from the home and account surfaces.',
      'Reworked the desktop Home screen into a two-column cockpit with persistent sidebar navigation, grouped currency balances, upcoming commitments and recent activity.',
      'Removed the duplicate Settings entry from the desktop sidebar and clarified Banking and Account labels.',
      'Kept Nett branding, country-aware balances, FX conversion, debts, Spaces, investments, commitments, PWA safe areas and dark/AMOLED themes intact.',
    ],
  },
  {
    version: '1.5.1',
    date: '2026-08-09',
    title: 'Plan item controls',
    commit: '33872fe',
    summary: 'Debts and future commitments can now be edited or removed directly from a dedicated management surface.',
    changes: [
      'Added clear Edit and Delete actions for every debt, loan and future commitment.',
      'Removed the account and its linked activity, snapshots and card details from the signed-in user’s Nett data.',
      'Added editable credit-card limits, balances, statement dates, minimum payments and due dates.',
      'Added Space-focused activity filters and linked ledger summaries for Car, Business and other purposes.',
      'Added confirmation dialogs before removing plan items.',
      'Persisted plan edits and deletions to the signed-in Supabase user account.',
    ],
  },
  {
    version: '1.5.0',
    date: '2026-08-08',
    title: 'Connected money control centre',
    commit: '6dbfde7',
    summary: 'Nett now connects accounts, workspaces, Spaces, debt events and card planning into focused views for monthly financial control.',
    changes: [
      'Added a visible account-card delete action with a confirmation flow and PWA cache refresh.',
      'Added editable credit-card limits, balances, statement dates, minimum payments and due dates.',
      'Added Space-focused activity filters and linked ledger summaries for Car, Business and other purposes.',
      'Linked additional debt borrowing and repayments into a selected Space without double-counting cash or net worth.',
    ],
  },
  {
    version: '1.4.4',
    date: RELEASE_DATE,
    title: 'Account deletion controls',
    commit: 'ceab314',
    summary: 'Accounts can now be permanently removed from the account editor with a clear confirmation and private, user-scoped deletion.',
    changes: [
      'Added a Delete account action to the Edit account flow with an explicit confirmation step.',
      'Removed the account and its linked activity, snapshots and card details from the signed-in user data.',
      'Kept linked debts and receivables intact while clearing their account relationship.',
    ],
  },
  {
    version: '1.4.3',
    date: RELEASE_DATE,
    title: 'Accounts clarity pass',
    commit: '0fbd523',
    summary: 'The Accounts page now has a clearer hierarchy and keeps FX context in one place instead of repeating it on every card.',
    changes: [
      'Removed repeated per-account FX rate labels; the FX context bar is now the single source of truth.',
      'Reworked account cards with clearer identity, country, local balance, converted amount and actions.',
      'Removed the duplicate Accounts heading and added a compact account-context row.',
      'Kept account movement and editing actions visible without crowding the balance hierarchy.',
    ],
  },
  {
    version: '1.3.1',
    date: RELEASE_DATE,
    title: 'Offline-ready financial entry',
    commit: '9eede0e',
    summary: 'The installed Nett experience now has an offline shell and a compatibility path while the new financial migration is being applied.',
    changes: [
      'Added service-worker caching and update cleanup for standalone PWA use.',
      'Added compatibility fallback for accounts, activity, debt, receivable, transfer and planning writes during migration rollout.',
      'Kept account metadata masked and recoverable from legacy notes until migration 0002 is present.',
    ],
  },
  {
    version: '1.3.1',
    date: RELEASE_DATE,
    title: 'Financial workflows release',
    commit: 'f5480d8',
    summary: 'Nett now has the foundations for real-world accounts, loans, IOUs, transfers, recurring planning and country-aware totals.',
    changes: [
      'Added bank/institution name, optional masked last four digits, country and inclusion controls to accounts.',
      'Added persisted transaction, debt-event, receivable-payment, transfer and check-in operations.',
      'Added debt/loan creation, flexible IOUs, partial receivable payments, reserves, Spaces and workspaces.',
      'Added recurring commitment occurrences, live FX refresh with historical rate storage, currency and country context controls.',
      'Reworked mobile navigation, safe areas, native-style sheets, typography, themes and installed-PWA layout.',
    ],
  },
  {
    version: '1.3.1',
    date: RELEASE_DATE,
    title: 'Email confirmation handoff',
    commit: 'f5a6220',
    summary: 'Email confirmation now returns people to a clear sign-in state instead of the app root.',
    changes: [
      'Redirected successful email confirmations to login with an “Email verified” notification.',
      'Handled expired or already-used confirmation links with a helpful login message.',
      'Added compatibility for older confirmation links that land on `/?code=...`.',
    ],
  },
  {
    version: '1.2.1',
    date: RELEASE_DATE,
    title: 'Signup entry fix',
    commit: 'c1393a2',
    summary: 'The public entry route now opens the account-creation state reliably after hydration.',
    changes: [
      'Fixed the `/login?mode=signup` redirect so new visitors see the signup form instead of sign in.',
    ],
  },
  {
    version: '1.2.0',
    date: RELEASE_DATE,
    title: 'Lotus brand release',
    commit: 'fa3892b',
    summary: 'Nett now carries the lotus mark consistently across the web app, PWA install surface and phone notifications.',
    changes: [
      'Replaced the placeholder Nett mark with the lotus brand asset across auth, onboarding, loading and desktop surfaces.',
      'Added the lotus as favicon, Apple Home Screen icon, PWA icon and notification artwork.',
      'Documented the independent Vercel + Supabase deployment setup and environment-variable locations.',
    ],
  },
  {
    version: '1.1.0',
    date: RELEASE_DATE,
    title: 'Ready for real users',
    commit: 'cc91d4c',
    summary: 'Authentication, onboarding and production-safe empty states are now part of the Nett launch path.',
    changes: [
      'Unauthenticated visitors are directed to account creation instead of seeing shared demo balances.',
      'New accounts receive a first-run setup flow for profile, currency and first account.',
      'Real users load only their own Supabase records; demo fixtures are no longer used as an authenticated fallback.',
      'Added a deployment configuration screen when Supabase environment variables are missing.',
      'Added public version and release notes with a repository commit reference.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-08-07',
    title: 'Initial MVP foundation',
    commit: 'f57322d',
    summary: 'The first Nett web-first MVP foundation with multi-currency finance surfaces, Supabase schema and PWA support.',
    changes: [
      'Added the Nett dashboard, accounts, activity, plan and settings surfaces.',
      'Added Supabase ownership policies, snapshots, notification subscriptions and keep-alive workflow.',
      'Added installable PWA scaffolding and Web Push subscription flow.',
    ],
  },
];
