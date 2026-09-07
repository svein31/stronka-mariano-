# Handmade trousers — cinematic storefront

## Scope and direction
Polish small-batch hand-decorated trouser store. New confirmed presentation: bold condensed sans, dark full-bleed photographic narratives, white product sections, selective liquid glass. Central placeholder brand in shared/brand.json. Preserve craft specificity and existing commerce.
Frontend AND Node/SQLite backend. Payments remain deferred under the user's explicit instruction; keep the provider seam and never fake paid status. Deliver source to GitHub without deployment.

## Routes and content
Keep /, /shop, /shop/:slug, /cart, /checkout, /order-confirmation, /process, /journal, /journal/:slug, /faq, /size-guide, /contact, /terms, /privacy, /shipping-returns and 404. Retain collection/atelier aliases.
Home: cinematic process hero → white product stage → dark pinned craft chapter → white focused product → dark journal.
Shop: URL-persisted material/technique/size filters plus ascending/descending price or collection-order sort; accessible empty/reset/count; a process story between product groups.
Product: white studio shot, detail and process views, required size/variant, material/care/lead time and add to cart. All long text remains on opaque surfaces.

## Architecture and interaction ownership
React19/Vite/TypeScript, existing GSAP/Lenis, R3F and Node24 native HTTP+SQLite. Add Motion for React (Framer Motion) for component interactions only. GSAP owns scroll sequences and CSS depth layers; R3F owns actual cloth mesh/camera. Motion owns product layout transitions, drawer/menu and CTA gestures. No shared animated transform across engines.
Visual capability policy independently gates animation, glass, parallax, pinning and WebGL. Conservative initial render; no rich effects on low/coarse/save-data devices. System reduced motion and user pause are absolute vetoes. Full desktop effects require session opt-in until real-device verification; the default experience is complete.

## Commerce remains authoritative
Shared demo catalog: integer grosz, valid variants/sizes, material parameters and madeToOrder=true. Quote API canonicalizes selection and delivery. Order API verifies fingerprint and customer/acknowledgement, writes snapshot in a transaction, status awaiting_arrangement / payment not_requested. Retry uses the same idempotency key and exact reviewed quote. Private receipt requires bearer token; hash only in DB, no PII/token in URLs.
Cart persists locally and successful submission consumes only submitted quantities. Unrelated additions remain. Lost responses preserve exact tab-local request; validation errors unlock editing. Contact/newsletter records persist but sending is not connected.
Keep bounded JSON/input/rate/origin checks, prepared SQL, migrations, owner CLI and private DB/env files. Production Node serves SPA+API; static-only hosting cannot serve orders.

## Content and legal
Generated product/process illustrations, prices, dimensions and lead times are development fixtures. White product treatments must preserve the referenced prints and cuts; originals remain for process/detail use. Label all conceptual images and document provenance.
Seller identity, policies, retention and actual production specifications need approval. Existing withdrawal draft distinguishes personalized specifications from merely made-after-order items and preserves complaint rights. Do not invent seller credentials or email delivery.

## Acceptance / release evidence
Build; static output for every route; filters/sort; cart persistence and variants; failed request/retry and private receipt; authoritative money and SQLite transaction tests; image fallbacks; dark/light/glass contrast audit; import-graph proof WebGL stays lazy; capability-policy tests for reduced, low-tier and save-data scenarios.
A physical mid-range phone is required to profile real frame time, responsiveness, heat and scrolling. No such test may be claimed from SSR or desktop emulation. Record remaining browser/physical-device checks and keep unprofiled rich effects opt-in. No deployment as part of this change.
