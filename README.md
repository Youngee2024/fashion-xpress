# Fashion Xpress 🛍️✨

[![Live Demo](https://img.shields.io/badge/demo-online-brightgreen.svg)](https://fashion-xpress.vercel.app)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-v8.3-646cff.svg)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A modern, high-fashion e-commerce web application modernized from a legacy static codebase into a modular, interactive React 18 frontend. Features simulated Virtual AR Try-On experiences, dynamic cart management, interactive collection filtering, community showcases, and dynamic product routing.

Phase 3 adds protected Supabase-backed Contact and Creator Application submissions plus a Resend-powered double-opt-in Newsletter workflow. In Live Mode these workflows fail closed until server-only credentials are configured. Real checkout, authentication, persistent Community accounts, blockchain, wallets, and garment tracking remain unavailable.

Phase 3.1 adds an explicit portfolio Demo Mode. It is the default when `VITE_APP_MODE` is missing or invalid. Contact, Creator Application, and Newsletter remain usable for validation and demo completion, but send no API request, email, or database record; form entries stay in memory and are cleared when the visitor acknowledges completion. Run locally with `npm run dev` (or set `VITE_APP_MODE=demo` in an ignored `.env.local`). On Vercel, set the public `VITE_APP_MODE` environment variable to `demo` and redeploy. The guided checkout still makes no payment or order; Community, minting, camera, and AR remain clearly labelled local prototypes.

To enable real submissions, set `VITE_APP_MODE=live` in the relevant Vercel environment and configure every server-only Phase 3 variable described in the setup guide, then redeploy and verify `/api/workflow-status`. Live Mode never falls back to simulated completion when the backend is missing: forms are disabled with a configuration-unavailable message so a visitor cannot mistake an unsent request for a real submission. No server credential may use a `VITE_` prefix.

Phase 4 adds passwordless Community accounts and RLS-protected publishing in Live Mode, with a fictional, memory-only Demo Community when `VITE_APP_MODE=demo`. The frontend uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; the service-role key remains server-only. Live account deletion is a separate protected API operation, and Community reports require manual administrative review. See [Phase 4 setup and operations](docs/phase-4-auth-community.md) before enabling Live Mode.

See [Phase 3 workflow setup](docs/phase-3-workflows.md) for database migration, email/DNS, environment, local development, Vercel deployment, testing, retention, and credential-rotation instructions.

---

## 🔗 Live Demo & Deployment

* **Production URL:** [https://fashion-xpress.vercel.app](https://fashion-xpress.vercel.app)
* **Deployment Platform:** Vercel (Automated CI/CD Pipeline)

---

## 🚀 Key Features & Architectural Upgrades

* **Dynamic Data-Driven Routing:** Consolidated six static product HTML detail pages into a single, unified dynamic route (`/collections/:id`) powered by centralized state and `products.js`.
* **Virtual AR Try-On Studio:** Integrated dynamic camera controls, 3D model positioning presets, lighting toggles, and interactive outfit selection overlays.
* **Global State & Cart Management:** Controlled React state managing slide-out cart drawer interactions, item quantity updates, dynamic subtotal calculations, and checkout states.
* **Community & Creator Hub:** Interactive social feed with search filtering, like counts, community post creation, and digital creator application flows.
* **Responsive Utility Styling:** Re-architected with Tailwind CSS v4 to guarantee seamless responsiveness across desktop, tablet, and mobile breakpoints.

---

## 🛠️ Tech Stack & Tooling

| Domain | Technology |
| :--- | :--- |
| **Frontend Core** | React 18, JSX |
| **Build & Tooling** | Vite v8.3 |
| **Styling Framework** | Tailwind CSS v4 |
| **Routing Engine** | React Router v6 |
| **Code Quality** | ESLint, Prettier |

---

## 📂 Project Structure

```text
fashion-xpress/
├── src/
│   ├── assets/          # SVG icons, visual assets, model previews
│   ├── components/      # Modular UI components (Navbar, Footer, CartDrawer, ProductCard)
│   ├── data/            # Centralized product catalog (products.js) & mock data
│   ├── pages/           # Application views (Home, Collections, ProductDetails, ArTryOn, Community, About, Contact)
│   ├── App.jsx          # Route declarations & global layout wrapper
│   ├── index.css        # Tailwind v4 imports & custom style utilities
│   └── main.jsx         # React DOM entry point
├── public/              # Static public assets & model files
├── vite.config.js       # Vite build & Tailwind CSS plugin configuration
└── package.json         # Project dependencies & operational scripts
