# Phase 3 workflow setup

Phase 3 adds real Contact, Creator Application, and double-opt-in Newsletter workflows. The browser never receives privileged credentials. Vercel Functions validate requests and use Supabase and Resend from the server.

## Architecture and endpoints

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/workflow-status` | `GET` | Reports only whether all required server configuration exists. |
| `/api/contact` | `POST` | Validates, rate-limits, stores, and notifies for contact messages. |
| `/api/creator-applications` | `POST` | Validates, rate-limits, stores, and notifies for creator applications. |
| `/api/newsletter/subscribe` | `POST` | Creates or refreshes a pending double-opt-in request and emails a confirmation link. |
| `/api/newsletter/confirm` | `POST` | Consumes a single-use confirmation token and adds or updates the confirmed Resend contact. |
| `/api/newsletter/unsubscribe` | `POST` | Consumes a single-use unsubscribe token and marks the Resend contact unsubscribed. |

All mutation endpoints accept only `application/json`. Contact and creator bodies are limited to 16 KiB; newsletter bodies are limited to 4 KiB. Public errors deliberately omit provider, database, and configuration details.

## 1. Create and configure Supabase

1. Create a Supabase project in the region appropriate for the people whose data you expect to receive.
2. Open **SQL Editor** in the project dashboard.
3. Review and run `supabase/migrations/202609150001_phase_three_workflows.sql` in full. If you use the Supabase CLI in an established migration workflow, apply it with `supabase db push` instead.
4. In **Project Settings → API**, copy the project URL and the server-side service-role key. Newer projects may label the elevated value as a secret key. Do not use it in browser code and do not create a `VITE_` version.
5. Confirm in the Table Editor that `contact_messages`, `creator_applications`, `newsletter_subscriptions`, and `submission_rate_limits` exist.
6. Confirm RLS is enabled and that `anon` and `authenticated` have no privileges on these tables or the rate-limit function. No public policies should exist.

The migration creates unique normalized newsletter emails, unique hashed tokens, duplicate-submission keys, status constraints, and a database-backed rate-limit function. Raw confirmation and unsubscribe tokens are never stored.

## 2. Create and verify Resend

1. Create a Resend account and add a sending domain you control.
2. Add the DNS records shown by Resend at your DNS provider. Use the exact names and values Resend supplies; they are specific to the domain and account.
3. Wait until Resend shows the domain as verified. Configure SPF and DKIM as instructed by its domain screen, and consider a DMARC policy after validating mail flow.
4. Create a restricted API key suitable for sending email and managing contacts.
5. Choose a sender on the verified domain, such as `FashionXpress <updates@your-domain.example>`. Prefer an address that can receive replies.
6. Choose a real administrative mailbox for contact and creator notifications.

No email is reported as delivered merely because a database row was stored. Contact/application storage succeeds independently of notification delivery. Newsletter confirmation remains pending if its confirmation email cannot be sent.

## 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill it locally. Never commit the populated file.

| Name | Visibility | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | Server only | Supabase project origin. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Elevated key used only by Vercel Functions. |
| `RESEND_API_KEY` | Server only | Resend email/contact API key. |
| `EMAIL_FROM` | Server only | Verified sender identity. |
| `EMAIL_ADMIN_TO` | Server only | Administrative notification recipient. |
| `PUBLIC_APP_URL` | Server only | Canonical origin used in email links, for example `https://fashion-xpress.vercel.app`. |
| `FORM_SECURITY_SECRET` | Server only | At least 32 random characters used for HMAC token, dedupe, and client hashes. |

Generate the hashing secret locally:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

There are no public Phase 3 variables and no secrets may use a `VITE_` prefix.

## 4. Run the complete app locally

The ordinary `npm run dev` command starts only Vite and cannot execute `/api` functions. Vite serves a local `available: false` status response so forms stay safely disabled without a missing-resource console error. Install and authenticate the Vercel CLI, then start the Vite app and functions together:

```bash
npm install --global vercel
vercel login
npm run dev:full
```

On first use, link the local folder to the intended Vercel project. `vercel dev` reads the project configuration and local environment. If you pull environment values, write them only to the ignored `.env.local` file:

```bash
vercel link
vercel env pull .env.local
npm run dev:full
```

Without complete credentials, `/api/workflow-status` returns `available: false`, forms remain visibly disabled, and server endpoints return a generic 503 response. This is intentional; no mock persistence or email is substituted in production UI.

## 5. Configure Vercel and deploy a preview

1. Open the linked Vercel project and go to **Settings → Environment Variables**.
2. Add all seven variables above. Use separate Supabase/Resend projects or credentials for Preview and Production when possible.
3. Set `PUBLIC_APP_URL` to the stable origin for that environment. Confirmation links from ephemeral preview URLs will stop working when the preview is removed.
4. Deploy a preview with `vercel` or by opening a pull request through the connected Git provider.
5. Confirm `/api/workflow-status` returns `{"available":true}` on the preview before testing personal data.
6. Promote only after the safe tests below pass. Production may be deployed with `vercel --prod` or through the normal Vercel promotion flow.

The SPA rewrite remains after Vercel’s filesystem/function handling, so real `/api` functions and public assets are served directly rather than rewritten to `index.html`.

## 6. Test each workflow safely

Use test addresses you control. Do not use real creator applications or sensitive messages in preview environments.

1. **Contact:** submit once, verify a `contact_messages` row and reference, then check the admin and acknowledgement delivery results in Resend. Simulate a Resend failure only with a non-production test adapter or invalid preview-only key; confirm the stored row remains.
2. **Creator:** submit an HTTPS portfolio URL, verify every expected field and consent time, and confirm no file is uploaded.
3. **Newsletter:** submit a mixed-case address, confirm it is normalized and pending, open the email link, explicitly confirm, and verify both the Supabase status and Resend contact.
4. Reuse the confirmation link and confirm it is rejected. Test a link after 24 hours in an isolated test database or automated test.
5. Open the unsubscribe link, explicitly unsubscribe, and verify Supabase changes before the Resend contact becomes unsubscribed. Reusing the link should reveal no account existence.
6. Run `npm test`; mocked clients ensure automated tests never contact real providers.

## 7. Retention and operations

The privacy notice states retention targets, but Phase 3 does not add a scheduled deletion job or administrative dashboard. Until one exists, review and delete aged contact/application rows manually, remove unconfirmed newsletter requests older than 30 days, and retain only the minimum suppression information needed to honor unsubscribes. Provider synchronization failures are marked `pending` for operational review.

Database-backed throttling limits abuse per hashed network/client signal, but it is not a CAPTCHA or bot-management service. Vercel/edge firewall controls and monitoring are recommended before high-volume promotion. IP addresses and user agents are HMAC-hashed for throttling and are not stored in submission tables.

## 8. Rotate an exposed credential

1. Revoke the exposed key immediately in Supabase or Resend.
2. Create a replacement with the minimum required privileges.
3. Update it in every affected Vercel environment and local ignored file.
4. redeploy so all functions use the replacement.
5. Review Supabase and Resend activity for misuse, invalidate related sessions/tokens if applicable, and document the incident.
6. If a secret entered Git history, removing the file in a later commit is insufficient. Rotate first, then purge history with an appropriate repository-history tool and coordinate a fresh clone for collaborators.

Never paste live credentials into source code, issues, screenshots, logs, chat, or test fixtures.
