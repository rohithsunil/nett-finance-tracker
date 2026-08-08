export const APP_VERSION = '1.1.0';
export const RELEASE_DATE = '2026-08-08';
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
