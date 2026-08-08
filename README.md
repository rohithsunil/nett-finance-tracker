# Nett

Nett is a personal financial operating system for multi-currency life. This repository contains the production-ready Next.js/PWA build and the original Streamlit visual demo.

## Run the production app

```powershell
npm install
npm run dev
```

Open <http://localhost:3000>. Without Supabase variables the app runs in a safe demo mode. To enable authentication and persistence, create `.env.local` from `.env.local.example` and add the values from the Supabase project Connect panel. Never commit `.env.local` or a service-role key.

## Verify the build

```powershell
npm run typecheck
npm test
npm run build
```

## Supabase

The production schema and row-level security migration is in `supabase/migrations/0001_nett_mvp.sql`. It creates the user-isolated finance model, immutable snapshot/audit surfaces, notification subscriptions, and the narrow keep-alive function. Run it once in the SQL editor for a new Supabase project. The migration has already been applied to the configured Nett project during the initial build.

The due-date notification sender is in `supabase/functions/send-due-reminders`. Deploy it as an Edge Function and configure its VAPID and service-role secrets before scheduling it.

## PWA and phone notifications

The app includes a manifest, install icons, a service worker and Web Push subscription flow. iOS users add Nett to the Home Screen before enabling notification permission. Android users can install it from a supported browser. Actual phone delivery requires the final app to be served over HTTPS.

## Supabase keep-alive

`.github/workflows/supabase-keepalive.yml` calls the restricted `touch_keepalive()` function every 12 hours. Add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` as GitHub Actions secrets. This is a best-effort free-tier activity monitor; Supabase Pro is the only plan that guarantees no inactivity pause.

## Original Streamlit demo

```powershell
python -m streamlit run streamlit_app.py --server.port 8501
```

Open <http://localhost:8501> for the original screen-model demo.
