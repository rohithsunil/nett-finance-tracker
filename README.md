# Nett

Nett is a personal financial operating system for multi-currency life. This repository contains the production-ready Next.js/PWA build and the original Streamlit visual demo.

## Run the production app

```powershell
npm install
npm run dev
```

Open <http://localhost:3000>. Supabase variables are required for the production app; without them Nett shows a configuration screen and never displays shared demo balances. Create `.env.local` from `.env.local.example` and add the values from the Supabase project Connect panel. Never commit `.env.local` or a service-role key.

## Verify the build

```powershell
npm run typecheck
npm test
npm run build
```

## Supabase

Vercel and Supabase are intentionally separate services. Nett connects to the independently hosted Supabase project through the two public browser variables below; no Vercel-Supabase integration is required. In Vercel open Project Settings → Environment Variables and add them to the Production environment, then redeploy.

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

The production schema and row-level security migration is in `supabase/migrations/0001_nett_mvp.sql`. It creates the user-isolated finance model, immutable snapshot/audit surfaces, notification subscriptions, and the narrow keep-alive function. Run it once in the SQL editor for a new Supabase project. The migration has already been applied to the configured Nett project during the initial build.

The due-date notification sender is in `supabase/functions/send-due-reminders`. Deploy it as an Edge Function and configure its VAPID and service-role secrets before scheduling it.

## Authentication and onboarding

The root route requires a Supabase session. New users are sent through `/onboarding`, which creates their profile, Personal workspace and first account (or lets them continue with an empty workspace). Configure Supabase Auth email confirmation and add the local and deployed callback URLs: `/auth/callback`.

## Releases

The current release is shown at `/changelog` and in `CHANGELOG.md`. For every pushed release, update `package.json`, `lib/app-meta.ts` and `CHANGELOG.md`; after pushing, record the short Git commit ID in the release entry and link it to GitHub.

## PWA and phone notifications

The app includes a manifest, install icons, a service worker and Web Push subscription flow. iOS users add Nett to the Home Screen before enabling notification permission. Android users can install it from a supported browser. Actual phone delivery requires the final app to be served over HTTPS.

## Supabase keep-alive

`.github/workflows/supabase-keepalive.yml` calls the restricted `touch_keepalive()` function every 12 hours. Add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` as GitHub Actions secrets. This is a best-effort free-tier activity monitor; Supabase Pro is the only plan that guarantees no inactivity pause.

## Original Streamlit demo

```powershell
python -m streamlit run streamlit_app.py --server.port 8501
```

Open <http://localhost:8501> for the original screen-model demo.
