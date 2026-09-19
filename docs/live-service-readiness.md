# Live-service readiness and deployment

This guide prepares FashionXpress for an eventual Live staging deployment without activating providers. The public portfolio remains `VITE_APP_MODE=demo`. Readiness checks are local structural checks only: they do not contact Supabase, Resend, Vercel, or any other service.

## Canonical configuration contract

The executable contract is [`config/environment-contract.js`](../config/environment-contract.js). `.env.example` is the only committed environment template; provider fields are deliberately empty.

| Variable | Visibility | Required for | Safe handling |
| --- | --- | --- | --- |
| `VITE_APP_MODE` | Public/browser | Mode selection | `demo` or `live`; missing/invalid values safely become Demo. |
| `VITE_SUPABASE_URL` | Public/browser | Live Auth, Profiles, Community, deletion | Project URL; public by design. |
| `VITE_SUPABASE_ANON_KEY` | Public/browser | Live Auth, Profiles, Community, deletion | Publishable/anon key protected by RLS; never substitute a service-role key. |
| `SUPABASE_URL` | Server only | Forms, Newsletter, deletion | Supabase project URL used by Vercel Functions. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Forms, Newsletter, deletion | Elevated secret; never prefix with `VITE_`. |
| `RESEND_API_KEY` | Server only | Form and Newsletter email | Restricted key stored only in server environment configuration. |
| `EMAIL_FROM` | Server only | Outbound email | Verified sender identity. |
| `EMAIL_ADMIN_TO` | Server only | Form notifications | Private operator mailbox. |
| `PUBLIC_APP_URL` | Server only | Email action links | Stable HTTPS origin for the deployed environment. |
| `FORM_SECURITY_SECRET` | Server only | HMAC, deduplication, throttling | At least 32 random characters; not reused from another service. |

Demo Mode needs no provider variable. Live Mode does not simulate success: missing browser configuration leaves Auth/Community unavailable, and missing server configuration disables submission workflows. Never put server-only variables in frontend source, logs, screenshots, build arguments, or `VITE_*` names.

## Readiness command

Run the public portfolio check with no provider credentials:

```bash
npm run readiness
```

It exits successfully in Demo Mode. To deliberately validate a Live staging environment:

```bash
npm run readiness -- --mode=live
```

Live validation checks presence and structural plausibility, lists each unavailable capability and exits non-zero if anything is missing or malformed. It prints variable names and the words `missing`, `invalid`, or `plausible`; it never prints values or secret fragments. A passing result does not prove credentials, DNS, migrations, RLS, email delivery, or provider availability. Those require the isolated manual checks below.

## Capability matrix

| Capability | Demo Mode | Live Mode | Provider/configuration | Readiness | Data stored | Known limitation |
| --- | --- | --- | --- | --- | --- | --- |
| Contact | Validates, then explicitly reports not sent | Server validates, stores, and emails acknowledgements/notifications | Supabase, Resend, all server workflow variables | Code ready; provider setup unverified | Demo: no; Live: private Supabase row | Manual retention and email retry |
| Creator Application | Validates, then explicitly reports not submitted | Server validates, stores, and emails acknowledgements/notifications | Supabase, Resend, all server workflow variables | Code ready; provider setup unverified | Demo: no; Live: private Supabase row | No upload or application dashboard |
| Newsletter | Validates, then explicitly reports not subscribed | Double opt-in, confirmation, and unsubscribe | Supabase, Resend, all server workflow variables | Code ready; provider setup unverified | Demo: no; Live: subscription/consent state | Bounce and retry handling are manual |
| Authentication | Fictional in-memory Demo identity | Six-digit Supabase email OTP | Public Supabase variables and Auth setup | Code ready; OTP/SMTP unverified | Demo: memory only; Live: Supabase Auth session | Deliverability/provider limits unverified |
| Profiles | Fictional in-memory profile | Auth-owned public Community profile | Supabase plus Phase 4 migration | Migration reviewed, not applied here | Demo: memory only; Live: public profile fields | Profiles are intentionally public |
| Community publishing | Local discussions, replies, likes, and report previews | RLS-protected server-confirmed content | Supabase plus Phase 4 migration | Migration reviewed; two-user test required | Demo: memory only; Live: Supabase rows | Moderation remains manual |
| Account deletion | Clears the local Demo identity/content | Authenticates caller and deletes their Auth user; cascades Community data | Public Supabase config plus server URL/service key | Code ready; cascade test required | Demo: no provider data; Live: Auth/Community removed | Phase 3 submissions need a separate request |
| Checkout | Local demonstration; no payment or order | Still demo-only | None | Ready as a prototype | Session-only concept receipt | No payment, order, fulfilment, or transfer |
| Minting | Local simulation with a fictional Demo Wallet | Still demo-only | None | Ready as a prototype | Session-only concept asset | No wallet, chain, token, ownership, or value |
| Virtual Try-On | Local image/camera composition | Still local-only | Browser camera/file APIs only | Ready as a prototype | Current page/session only; downloads are user-directed | No upload, production tracking, or fit guarantee |

## Migration readiness review

Apply migrations exactly once through one controlled migration path, in filename order:

1. `202609150001_phase_three_workflows.sql` creates `pgcrypto`, private Contact/Creator/Newsletter/rate-limit tables, and `consume_submission_rate_limit`.
2. `202609160001_phase_four_community.sql` relies on UUID generation and Supabase Auth, then creates profiles, discussions, replies, likes, reports, rate limits, triggers, and RLS policies.

The review found RLS enabled on every application table. Phase 3 revokes browser access and grants workflow access only to `service_role`. Phase 4 revokes defaults, grants only the columns/actions required by browser roles, exposes published content and public profile fields, restricts writes by `auth.uid()`, and leaves reports/rate limits without browser reads. Trigger functions manage timestamps, cooldowns, and counts. Every `SECURITY DEFINER` function uses `set search_path = ''`; referenced database objects are schema-qualified. No committed migration was changed.

The migrations do not maintain a repository-side migration ledger when pasted into SQL Editor. Do not both paste them manually and run `supabase db push`. Choose one method, record the filenames applied, and verify Supabase migration history before rerunning. The Phase 4 migration intentionally uses non-idempotent creation statements, so a second manual application should fail rather than silently create a divergent schema.

Rollback is not automatic. Phase 4 tables depend on Auth users and on one another through foreign keys and cascade behavior; dropping them destroys Community data. Phase 3 rollback can destroy private submissions and newsletter consent state. Before any rollback outside a disposable project, take a provider backup, map retention obligations, export only what is lawfully required, and use a reviewed forward migration where possible.

### Disposable Supabase activation procedure

1. Create a disposable Supabase project that contains no production data.
2. Record its project URL and public anon/publishable key in an ignored local file; do not commit them.
3. Obtain the service-role/secret key only for server-side testing and keep it out of browser variables, source, terminals shared on screen, and logs.
4. Apply `202609150001_phase_three_workflows.sql`, then `202609160001_phase_four_community.sql`, using one migration mechanism.
5. Run `supabase/tests/phase_four_rls.sql` in that disposable project and retain its output privately. This repository run does not claim those SQL checks passed.
6. Create two disposable email-OTP accounts and complete separate Community profiles.
7. As each account, create content; verify the other account cannot update/delete it, while the owner can. Also verify unpublished/hidden content is not publicly readable.
8. Verify only the intended profile fields are readable and that no email or Auth metadata appears in `community_profiles` or public queries.
9. Submit a report, then verify `anon`, the reporter, and the reported user cannot select report rows; inspect it only through restricted administration.
10. Exercise discussion, reply, like, and report cooldowns and verify early repeats are rejected by database triggers.
11. Delete one disposable Auth user through the application; verify their profile, authored content, replies, likes, reports, and rate-limit rows cascade, while unrelated users remain. Verify Phase 3 submissions are not falsely deleted as account data.
12. Enable only email sign-in and configure the email template to show the six-digit OTP token; do not enable password, phone, social, or anonymous providers for this scope.
13. Set the Auth site URL and exact localhost, stable Preview, and Production redirect allow-list entries. Do not use unrestricted wildcard production redirects.
14. Test OTP expiry/reuse/rate limits, refresh/session restoration, sign-out, a new session, and failure states without claiming success before Supabase confirms it.
15. Delete the disposable accounts and test rows when finished, then destroy the disposable project if it is no longer needed. Destructive cleanup remains a deliberate manual operator action.

## Resend activation procedure

1. Create a Resend account owned by the project operator.
2. Add a sending domain controlled by the operator; do not use a placeholder or third-party domain.
3. Add the exact SPF/DKIM records supplied by Resend at the DNS provider and wait for verified status; add an appropriate DMARC policy after mail-flow testing.
4. Create a restricted API key with only the permissions needed by these workflows; store it only as `RESEND_API_KEY` in ignored/server environment settings.
5. Configure `EMAIL_FROM` on the verified domain and a private `EMAIL_ADMIN_TO`; never commit either real mailbox.
6. In isolated Preview, send a Contact test using non-sensitive data and verify both acknowledgement and administrative notification outcomes.
7. Repeat for Creator Application and confirm no portfolio file upload occurs.
8. Submit Newsletter, verify pending state, open the confirmation link once, and verify confirmed state and the Resend contact.
9. Verify an expired token and a reused token fail safely without revealing subscription existence.
10. Use the unsubscribe flow once and verify both Supabase state and Resend contact state; verify link reuse is safe.
11. Review provider events for bounces or failed delivery and compare them with application notification/provider-sync states; handling remains manual.
12. If a key is compromised, revoke it first, create a least-privilege replacement, update each affected environment, redeploy, review activity, and document the incident.

## Vercel deployment procedure

### Local development

- Keep `.env.local` ignored. Use `VITE_APP_MODE=demo` with `npm run dev`; no provider variables are required.
- For an isolated Live integration check, use disposable provider credentials and `npm run dev:full` so Vercel Functions exist. Run `npm run readiness -- --mode=live` first.
- Do not paste environment values into commands, issues, screenshots, or logs.

### Vercel Preview (Live staging only)

1. Create a stable Preview/staging hostname and add the canonical contract variables under **Project Settings → Environment Variables**, scoped to Preview. Use disposable/non-production Supabase and Resend resources.
2. Set `VITE_APP_MODE=live`, both public Supabase variables, and every server-only variable. Set `PUBLIC_APP_URL` to that stable Preview origin.
3. Add the exact Preview origin to the Supabase Auth redirect allow-list. Confirmation links must use the same stable origin, not an expiring branch URL.
4. Redeploy after every environment-variable change because public values are embedded at build time and function instances need refreshed server values.
5. Run the activation checklist and verify `/api/workflow-status` only reports availability, then manually test expected API, database, Auth, and email behavior. Review browser network activity and Vercel function logs for accidental personal data.

### Vercel Production (public portfolio)

- Keep `VITE_APP_MODE=demo`. Production needs no provider credentials for portfolio behavior; retained server variables, if any, remain inaccessible and unused by Demo workflows.
- Record the canonical Production URL in `PUBLIC_APP_URL` only when preparing a future approved Live release. Allow-list the exact Production origin in Supabase before activation.
- Do not switch Production directly to Live. Approve an isolated Preview after real provider, RLS, privacy, deletion, and email checks, then copy deliberately scoped values and redeploy.
- After deployment, verify the visible mode, Demo completion language, zero provider requests, direct routes/assets, no public secrets, and private function logs. Never log form bodies, tokens, credentials, or personal email addresses.

Vercel rollback of application code does not necessarily revert environment variables. For a service incident, explicitly set Production `VITE_APP_MODE=demo`, redeploy, verify the Demo network behavior, and investigate Live resources separately.

## Activation and rollback checklists

### Activate Live Mode in approved staging

- [ ] All canonical provider variables are configured in the intended environment and readiness passes.
- [ ] Both migrations are applied once, in order, to the isolated project.
- [ ] SQL/RLS checks and the two-user ownership/privacy tests pass.
- [ ] Six-digit OTP, expiry, retry limits, restoration, and sign-out are tested.
- [ ] Contact, Creator, and Newsletter persistence is verified with non-sensitive test data.
- [ ] Acknowledgements, notifications, confirmation, unsubscribe, failures, and delivery status are tested.
- [ ] Account deletion and Community cascades are verified without affecting another user.
- [ ] Privacy, Terms, retention, and operator handling accurately describe the enabled services.
- [ ] The isolated Preview is reviewed and explicitly approved before any Production change.

### Roll back to Demo Mode

- [ ] Set the affected Vercel environment to `VITE_APP_MODE=demo`.
- [ ] Redeploy so the public bundle contains the changed mode.
- [ ] Confirm Contact, Creator, Newsletter, Auth, and Community make zero provider/API requests in Demo flows.
- [ ] Confirm each Demo completion message remains explicit and no personal form data persists.
- [ ] Preserve existing provider data securely; do not expose or automatically delete it during rollback.
- [ ] Investigate and remediate the Live issue separately before another staged activation.

## Operational limitations

Report moderation, retention cleanup, email retry processing, bounce handling, provider monitoring, incident response, user-data deletion requests, and database backups all require documented human operations or future tooling. Phase 3 submissions are separate from account deletion and must be located/handled under the applicable request and retention process. There is no SLA or automated moderation/cleanup guarantee.

Real payment processing, orders, fulfilment, wallet connections, blockchain transactions, ownership, licences, scarcity, and transferable assets are unavailable. Virtual Try-On remains a local visual prototype: it does not upload images, perform production body tracking, or guarantee size/fit.
