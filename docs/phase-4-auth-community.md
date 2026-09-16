# Phase 4: authentication and Community setup

Phase 4 preserves two explicit modes. `VITE_APP_MODE=demo` (or a missing/invalid value) uses a fictional Runway Guest identity and in-memory Community content; it makes no Supabase or `/api` requests. Refreshing the tab or selecting **Reset demo community** discards local discussions, replies, likes, and report previews. Contact, Creator, and Newsletter retain their Phase 3.1 Demo behavior.

`VITE_APP_MODE=live` uses Supabase Auth and the Phase 4 Community tables. There is no simulated fallback if public or server configuration is missing. The Live account workflow requests a six-digit email OTP, verifies it, restores the SDK-managed session, and signs out. Live discussions, replies, likes, and reports are server-confirmed and guarded by RLS. Existing Phase 3 Contact, Creator, and Newsletter workflows continue to use protected Vercel functions.

## 1. Supabase Auth setup

1. In Supabase Auth providers, enable email sign-in and allow new users to sign up. Do not enable password, phone, social, or anonymous sign-in for this phase.
2. Configure the email template to include `{{ .Token }}` so Supabase sends a six-digit OTP rather than only a magic link. Configure a verified SMTP provider and test deliverability in a non-production project. See [Supabase email OTP documentation](https://supabase.com/docs/guides/auth/auth-email-passwordless) and [signInWithOtp](https://supabase.com/docs/reference/javascript/auth-signinwithotp).
3. Set the Auth site URL to the canonical production origin. Add exact localhost, stable Vercel Preview, and production origins/redirect URLs in Supabase Auth URL Configuration. This app uses on-page code entry rather than an email redirect, but correct URL settings still protect future Auth links.
4. Review Supabase OTP expiry and rate limits. The UI provides a 60-second resend cooldown; Supabase remains the trusted throttle. Do not claim a code was sent if the provider fails.

## 2. Database migration and security

Apply `supabase/migrations/202609160001_phase_four_community.sql` after the Phase 3 migration, in an isolated preview project first. It creates `community_profiles`, `community_discussions`, `community_replies`, `community_likes`, `community_reports`, and `community_rate_limits`. Every table has RLS enabled. Public reads are limited to safe profile fields and published discussions/replies; likes expose only a member's own rows, and reports/rate limits have no browser SELECT grant. Identity labels are display-only, never authorization roles. Database constraints and trigger-backed cooldowns protect writes in addition to browser validation.

Run `supabase/tests/phase_four_rls.sql` in the same disposable database after applying the migration. It checks RLS, grants, ownership-policy presence, published-only policies, report privacy, and the unique-like key without creating users. Also run two-user integration tests in that disposable project before production; this repository does not contain real Supabase credentials to execute them automatically.

Auth-user deletion cascades through the profile, authored content, replies, likes, reports, and rate-limit rows. The UI's account-deletion action requires a fresh authenticated bearer token and exact confirmation; the Vercel function verifies the token, then uses the server-only service-role key to delete only that Auth user. Separate Phase 3 contact, creator, and newsletter records are **not** linked to Community accounts; handle those deletion requests separately.

Reports do not create a moderation dashboard. Review them through restricted Supabase administrative access, determine the appropriate action, and mark content `hidden` or `removed` only through privileged SQL/admin operations. Do not promise a review time. Public browser roles cannot change content status.

If a migration rollback is required before production data exists, review dependencies and run the following only in the intended disposable project:

```sql
drop table if exists public.community_reports;
drop table if exists public.community_likes;
drop table if exists public.community_replies;
drop table if exists public.community_discussions;
drop table if exists public.community_rate_limits;
drop table if exists public.community_profiles;
drop function if exists public.community_update_counts();
drop function if exists public.community_guard_write();
drop function if exists public.community_touch_updated();
```

After real accounts exist, export and review the data-retention/deletion implications first; rollback is destructive and must not be automatic.

## 3. Environment variables

Copy `.env.example` to ignored `.env.local` for local development. Set `VITE_APP_MODE=demo` and run `npm run dev` with no Supabase credentials for the portfolio experience. For Live Mode set the following in the matching Vercel Preview/Production environment and redeploy:

| Variable | Visibility | Purpose |
| --- | --- | --- |
| `VITE_APP_MODE` | Public | `demo` or `live`; missing/invalid defaults to Demo. |
| `VITE_SUPABASE_URL` | Public | Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Public | Supabase publishable/anon key. Protected by strict RLS, not secrecy. |
| `SUPABASE_URL` | Server only | Project URL for Phase 3 functions and account deletion. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Elevated server key. Never use a `VITE_` prefix or import into frontend code. |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_ADMIN_TO`, `PUBLIC_APP_URL`, `FORM_SECURITY_SECRET` | Server only | Existing Phase 3 workflows. |

In Live Mode, both public values and the Phase 3 server-only values must be configured for all workflows. The account-deletion function specifically needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_ANON_KEY`, and `VITE_APP_MODE=live` in Vercel. Never paste real values into documentation, logs, source files, or browser tests.

Locally, use `npm run dev:full` for Vercel functions. Ordinary Vite can render Live UI but cannot execute `/api` routes; it is intended for Demo Mode. On Vercel, add variables in **Settings → Environment Variables**, scope Preview and Production deliberately, and redeploy because `VITE_*` values are compiled into the frontend bundle.

## 4. Safe verification and operations

Use a disposable Supabase project and test email address you control. Confirm OTP request, invalid/expired/rate-limited code states, verification, first profile setup, refresh restoration, sign-out, and safe return to a local route. Test public reads, cross-user update/delete denial, hidden content, duplicate likes, report privacy, cooldowns, and deletion before inviting real users. Do not use production credentials or create real accounts in automated tests.

Run `npm run lint`, `npm test`, `npm run build`, and the browser smoke script. Automated tests mock the Supabase client and cannot prove the deployed project's Auth template, SMTP delivery, RLS grants, or SQL triggers. Review those manually in the isolated project. Remove test users via the account UI or restricted Supabase Auth administration and verify cascaded Community data; delete separate Phase 3 test submissions under their own retention policy.

For recovery, retain the migration and a database backup before changes. Rotate an exposed service-role key immediately and redeploy. The publishable key is browser-visible by design; its safety depends on correct RLS, grants, and project configuration. See the [Supabase RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security) and [Auth user management](https://supabase.com/docs/guides/auth/managing-user-data).
