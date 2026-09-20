# FashionXpress launch checklist

This checklist packages the public project as a truthful Demo Mode portfolio piece. It does not activate Supabase, Resend, payments, blockchain or any other Live service.

## Copy-ready GitHub metadata

**Repository description**

> Polished African digital-fashion e-commerce portfolio prototype with Naira pricing, digital-use licences, Virtual Try-On, Community and an optional Collectibles Lab.

**Website URL**

> https://fashion-xpress.vercel.app

**Topics**

> react, vite, tailwindcss, react-router, ui-ux, digital-fashion, responsive-design, accessibility, portfolio-project, supabase, vercel

**Social preview image**

> Upload `docs/assets/fashionxpress-cover.jpg` in GitHub **Settings -> General -> Social preview**. It is 1600 by 900 pixels and uses only verified project screens.

GitHub does not automatically use the application's Open Graph image as the repository social preview; upload the file directly.

## Required before launch

### Repository settings and documentation

- [ ] Add the repository description exactly as shown above.
- [ ] Set the Website field to `https://fashion-xpress.vercel.app` after confirming the deployment opens correctly.
- [ ] Add the recommended GitHub topics.
- [ ] Upload `docs/assets/fashionxpress-cover.jpg` as the repository social preview.
- [ ] Confirm the repository visibility is the intended public/private setting.
- [ ] Confirm the default branch is `main` and branch protection matches the project's needs.
- [ ] Confirm the README Live Demo and Repository links open in a signed-out browser.
- [ ] Replace the timeline placeholder in `docs/CASE-STUDY.md` with verified dates, or leave it clearly marked as unknown.
- [ ] Confirm redistribution rights for the fashion imagery before broad public promotion.

### Vercel and Demo Mode

- [ ] Set `VITE_APP_MODE=demo` for Production in Vercel.
- [ ] Remove any unnecessary production provider credentials, or confirm they remain server-only and unused in Demo Mode.
- [ ] Redeploy after checking environment scope; `VITE_*` values are compiled at build time.
- [ ] Open the deployed app and confirm the visible Demo indicators appear near forms and prototype actions.
- [ ] Confirm Contact ends with `Demo complete—your message was not sent.`
- [ ] Confirm Creator Application ends with `Demo complete—your application was not submitted.`
- [ ] Confirm Newsletter ends with `Demo complete—your email was not subscribed.`

### Primary journey check

- [ ] On a physical mobile device, check Home, Collections, Product Detail and navigation at approximately 393px width.
- [ ] Add a product, update its quantity and refresh to confirm the namespaced bag persists.
- [ ] Complete licence-first Demo Checkout and confirm the Naira total creates only a local Digital Wardrobe record.
- [ ] Open the optional Collectibles Lab and confirm the Demo Wallet, `demo:` identifiers and “not on-chain” language remain visible.
- [ ] Enter Demo Community, add and like a local discussion, then confirm no online publication is claimed.
- [ ] Test Virtual Try-On camera permission: allow, deny and retry. Confirm the camera stops after leaving the page.
- [ ] Test local-photo Try-On and confirm the composition downloads locally without an upload request.
- [ ] Reset Digital Wardrobe, Collectibles Lab and Demo Community independently, then confirm their empty states are clear.

### Deployment and security check

- [ ] Check a direct nested URL and refresh it; confirm Vercel returns the React route rather than a 404.
- [ ] Open an invalid URL and confirm the designed in-app 404 appears.
- [ ] Confirm `/api/*`, `/assets/*`, `/images/*`, the favicon and `robots.txt` are not rewritten to `index.html`.
- [ ] Inspect production response headers for CSP, Permissions Policy, Referrer Policy, `nosniff` and frame protection.
- [ ] Confirm the browser console has no errors on the primary journeys.
- [ ] Confirm the Network panel shows no wallet, RPC, blockchain, IPFS or provider-form request in Demo Mode.
- [ ] Confirm no `.env`, log, browser profile, build output or QA artifact is tracked.
- [ ] Confirm source maps and production error messages reveal no server-only values.

### Metadata and final editorial review

- [ ] Confirm the browser title and description change on Home, Collections, Product Detail, Checkout, Digital Wardrobe, Collectibles Lab, Community and Try-On.
- [ ] Inspect the deployed page source for Open Graph and Twitter/X card defaults.
- [ ] Confirm the canonical URL follows the deployed origin and current route.
- [ ] Confirm `/images/social-preview.jpg` loads from the deployed site.
- [ ] Confirm the social preview presents Naira commerce, digital-use licences, Virtual Try-On and Digital Wardrobe without implying live transactions.
- [ ] Test the Live Demo link through a social-card debugger after deployment.
- [ ] Run a final spelling review across README, case study, portfolio copy and in-app launch metadata.
- [ ] Confirm all public claims describe verified interface behavior rather than customers, revenue, research or production adoption.

## Portfolio publication

- [ ] Add FashionXpress to the main portfolio site with the project-card copy in `docs/PORTFOLIO-COPY.md`.
- [ ] Link the portfolio card to the case study, Live Demo and repository as appropriate.
- [ ] Use descriptive alt text for the cover and every featured screen.
- [ ] Check the portfolio card on mobile and keyboard navigation before publishing.

## Optional promotion

### Behance

- [ ] Build a concise Behance sequence from the cover, problem, design principles, selected journeys, responsive views and outcome.
- [ ] Use only the curated images in `docs/assets/`; do not upload the full QA screenshot set.
- [ ] Paste and adapt the Behance introduction from `docs/PORTFOLIO-COPY.md`.
- [ ] Include a clear note that the public experience runs in Demo Mode.
- [ ] Link to the Live Demo and repository.

### LinkedIn

- [ ] Adapt the launch post in `docs/PORTFOLIO-COPY.md` to the final voice.
- [ ] Attach `docs/assets/fashionxpress-cover.jpg` or a short recording of the verified Demo journey.
- [ ] Check the link preview before posting.
- [ ] Avoid describing prepared Live integrations as active production services.

### Additional presentation

- [ ] Add a 30-60 second walkthrough showing Home, Product Detail, Checkout, Digital Wardrobe, Try-On, Community and the optional Collectibles Lab.
- [ ] Add a concise architecture image only if it improves an interview presentation.
- [ ] Prepare a short explanation of why Demo and Live capabilities are separated.

## URL changes

The current repository and documentation use these existing project URLs:

- Repository: `https://github.com/Youngee2024/fashion-xpress`
- Deployment: `https://fashion-xpress.vercel.app`

If the final production domain changes, update the README, portfolio copy, GitHub Website field and any hosted social-card checks. For a future Live deployment, also update `PUBLIC_APP_URL` and Supabase Auth allow-lists in the correct environment. Do not add an unconfirmed domain to source control.
