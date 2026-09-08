# Mariano — autorskie kolekcje

Aktualny model: ręcznie tworzone designy, gotowe produkty wytwarzane przez partnerów w Bangladeszu i sprowadzane do Polski. [Instrukcja wydania, dropów, animacji i Netlify](RELEASE.md) opisuje nowy panel oraz paczki ZIP. Płatności pozostają wyłączone.

# Handmade trousers workshop

React 19 + TypeScript + Vite storefront, GSAP/Lenis choreography and optional Three.js fabric studies. A Node 24 + SQLite backend stores orders, contact messages and newsletter requests. **Payments are disabled.**

Read [OPERATIONS.md](OPERATIONS.md) for the order service center, production planning, inventory, staff, media and carrier setup. [API.md](API.md) documents versioned endpoints.

Read [INTEGRATIONS.md](INTEGRATIONS.md) for the new owner panel, SMTP, backups, HTTPS and setup checklist. Private account credentials must be configured on the computer/server running the app; they are not shipped through GitHub.

The placeholder brand name lives in `shared/brand.json`. SQLite is the authoritative editable product catalog; shared/catalog.json seeds new databases and supplies a static demonstration fallback. Shipping data remains shared. All current products, prices, sizing and generated photographs are demonstrative and need approval before public sales.

## Run on your own computer (Windows, macOS or Linux)

Install Node.js 24 or later and Git. Open Terminal / PowerShell, then:

```sh
git clone https://github.com/svein31/stronka-mariano-.git
cd stronka-mariano-
git switch main
npm ci
npm run owner:setup
npm run dev
```

Keep that terminal open. Open **http://127.0.0.1:5173** in the browser on the **same computer**. One command starts Vite on 5173 and the API on 3001. Stop with Ctrl+C. Nothing is deployed. If Git is unavailable, download the branch using GitHub → Code → Download ZIP, extract it, open a terminal in the extracted folder and run the npm commands.

`127.0.0.1` always means the computer running your browser. A server running in a remote coding session does not start a server on your Windows PC. A refused connection normally means the local command has not started or has stopped. Read the terminal error; do not change firewall settings as the first step.

Optional: copy `.env.example` to `.env` (`Copy-Item .env.example .env` in PowerShell). Defaults already work in demo mode. The dev proxy expects API port 3001; update Vite's proxy if changing that port.

## Production-shaped local check

```sh
npm run build
npm start
```

Open http://127.0.0.1:3001. The Node process serves both `dist/` and `/api/`. This is not a static-only app: uploading just `dist` to a static host will not supply a working checkout.

## Routes and behavior

- Home, `/shop` (material / technique / size filters), `/shop/:slug`, `/process`, journal and articles.
- `/cart`, `/checkout`, `/order-confirmation`.
- FAQ, size guide with concrete demo measurements, contact, terms, privacy and shipping/returns.
- Existing `/collection`, garment URLs and `/atelier` remain supported; unknown paths render a helpful 404 page.

The basket survives reloads in localStorage. Prices restored from storage are ignored in favor of the catalog. Checkout requests an authoritative quote, requires the chosen size/variant, and submits an order with a quote fingerprint. A changed quote returns 409 for review. Only the API can calculate persisted totals.

Orders have `awaiting_arrangement` status and `not_requested` payment status. Saving is an enquiry pending workshop confirmation, not a completed sale. No payment is collected. Configured SMTP sends confirmations and progress updates through an encrypted durable outbox.

A cryptographically random idempotency key and private receipt token are saved in sessionStorage **before** submission. Retry after a lost response sends the same request and returns the same order. Ambiguous network/5xx failures retain the pending request; definitive validation failures unlock editing. The receipt token is sent in an Authorization header, never in the URL, and only its hash is stored in SQLite. Receipt access expires after 30 days and may be revoked. Email tracking links use a separate expiring secret in the fragment, removed by the tracking page. Closing the browser session can remove access to the receipt. Print/save it before closing.

## Backend contract

| Endpoint | Behavior |
| --- | --- |
| GET /api/health | Health |
| GET /api/catalog | Canonical products, delivery options, demo/seller config |
| POST /api/quote | Validate lines and delivery; calculate PLN grosz totals and fingerprint |
| POST /api/orders | Validate customer/acknowledgement, quote, idempotency; save transactionally |
| GET /api/orders/:id | Private receipt; requires Bearer access token |
| POST /api/contact | Store a message, does not email it |
| POST /api/newsletter | Store consent in pending_confirmation, does not start sending |

Mutation requests require an allowed Origin and JSON. Inputs and body size are bounded. SQL statements are parameterized. Orders use a transaction and a unique idempotency key. The server sends no-store for API responses, sanitizes internal errors and applies a persistent SQLite per-IP and per-endpoint rate limits. For public use, configure a trusted TLS proxy and edge rate limiting; untrusted forwarded IP headers are deliberately ignored.

## Data and owner access

The database is created at `var/store.sqlite` (or DB_PATH), with WAL and versioned schema migrations. Database and environment files are excluded from Git. Back up using SQLite's online backup mechanism or stop the server before copying; don't copy only the main database while WAL writes are active.

```sh
npm run orders
npm run orders -- ORDER_UUID
```

This local, read-only owner CLI lists the latest 50 orders or displays an order's customer and canonical snapshot. It requires filesystem access to the database; the /admin web panel additionally provides authenticated catalog, order and customization management. Contact and newsletter tables can be reviewed with a local SQLite client. The owner is responsible for access control, retention and backups. Never paste customer exports into public issues.

## Payment integration seam

`server/payments.mjs` contains a disabled adapter. The order schema already has payment status, provider and provider reference fields. A future integration must:
1. Load an order from SQLite and create a provider session from its persisted amount/currency.
2. Verify provider webhook signatures and apply idempotent, transactional state changes.
3. Add expiry/cancellation, refund and failed-payment UX and tests.
4. Never trust redirect parameters or client prices to mark an order paid.

No provider keys, SDK, live payment endpoint or pretend successful payment are present.

## Motion, images and access

The original route focus restoration, focus traps, geometry budgets, reduced-motion gate, Lenis and GSAP are retained. Transitions bypass cart/checkout/receipt. The fabric material now uses cotton/linen parameters, neutral light and dark tones and a procedural printed pattern. Photography and readable text remain independent of WebGL. Optional modules load near the viewport; canvases stop offscreen or in hidden tabs. Swatches retain keyboard range controls. Reveals animate transform and opacity.

`PhotoPlate` loads responsive local WebP images, tries JPG on failure, reserves space and retains a descriptive fallback. See `public/media/README.md` for replacement instructions. Generated imagery is explicitly labelled: it is not evidence of actual products or workshop processes.

## Validation

```sh
npm run build
npm run audit:palette
npm test
```

Tests extend the existing Vite SSR regression approach for every route, filters, persisted cart, selection and image fallbacks. HTTP/SQLite tests cover canonical totals, rejected variants, failed requests, idempotent retries, private receipts, persistence, contact/newsletter, origin and body limits, and disabled payments. A production import-graph check verifies that Three does not enter the initial bundle.

Browser-based visual/keyboard/screen-reader QA, actual WebGL behavior on devices, and measured Lighthouse/LCP/CLS remain release checks; SSR tests do not establish WCAG conformance or performance scores.

## Before public use

Review DESIGN.md and PRODUCT.md. Replace generated media, demo prices, specifications and measurements with real approved data. Confirm taxes, shipping, lead times, seller identity, policies and privacy/retention details with the owner and legal reviewer. The legal draft requires owner review against the actual ready-made sales model.

The default STORE_MODE is demo. Setting live requires complete seller fields, an HTTPS PUBLIC_ORIGIN, POLICIES_APPROVED=true and a non-draft POLICY_VERSION. This configuration gate does not substitute for reviewing actual legal copy or replacing demo assets. Configure and test SMTP, the owner account/TOTP, private backups and the owner workflow before accepting real enquiries. Payments remain disabled even in live mode.

## Cinematic redesign / motion responsibilities

The latest brief replaces the warm serif presentation with condensed athletic type, full-bleed dark process stories, white product stages and a single lime accent. White studio product images are generated edits of the original concept assets. No Nike logo, copy or media is used.

GSAP/ScrollTrigger owns the desktop pinned hero and craft chapter, scrubbed CSS perspective layers, and the existing fabric scene's camera/mesh travel. Motion for React (Framer Motion) owns drawer/menu transitions, product layout changes when filtering/sorting, and bounded magnetic CTA gestures. Checkout remains opaque and does not use those decorative interactions.

Navigation, filters and the drawer have a solid default. Capable devices can apply a fixed 8px backdrop blur; rgba(12,13,16,.94) protects text contrast over any photo. A 2px moving edge highlight stays outside the text surface. Blur itself is never interpolated. Unsupported backdrop-filter, reduced transparency, reduced motion, low tier and save-data retain solid panels.

Animations start automatically; navigation has no 3D or pause switches. Phones receive unpinned image parallax, staggered craft typography and cloth rendering at 48 subdivisions with DPR capped at 1.25. Desktop starts at 96 subdivisions and DPR 1.5. After a warmup, sustained rendering below 35 FPS over four seconds reduces the shared quality tier; the lowest tier keeps the static composition. Canvas chunks remain lazy and off-screen/hidden-tab loops stop. System reduced motion, save-data and WebGL availability remain authoritative.

Physical phone profiling and browser QA remain unperformed. Automatic budgets are safeguards, not measured performance guarantees. Remaining checks include frame time, responsiveness, LCP/CLS and memory on a real phone, 320px/200% zoom, keyboard dialogs, reduced motion during a pinned chapter, WebGL context loss and blur-disabled rendering.

Implementation references: [Motion installation](https://motion.dev/docs/react-installation), [Motion accessibility](https://motion.dev/docs/react-accessibility). The existing backend and disabled-payment contract are unchanged.
