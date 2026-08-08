# Nett Supabase setup

1. Open the Supabase SQL editor for the new `nett-finance` project.
2. Run `migrations/0001_nett_mvp.sql` once, then run `migrations/0002_nett_financial_workflows.sql`.
3. In the app environment, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Configure Auth > URL Configuration with the local and deployed site URLs, including the callback path `/auth/callback` for email confirmation and password recovery.
5. Add GitHub repository secrets named `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` for the scheduled keep-alive workflow.
6. Deploy `functions/send-due-reminders` and set its server secrets: `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`.
7. Schedule the function daily using Supabase Cron or a protected external scheduler with the project service-role key.

The migration creates a narrow `touch_keepalive()` function that updates only a non-sensitive heartbeat row. It is intentionally not a general database write endpoint.

The reminder function sends only user-authorized due-date reminders to registered Web Push subscriptions. Expired subscriptions are removed automatically. The service-role key and VAPID private key must remain server-side.

Migration 0002 adds the masked account metadata and country fields plus authenticated database functions for atomic activity, transfers, debt events, receivable payments and audit records. Apply it before testing the new financial forms in production.
