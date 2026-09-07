# Handmade trousers — product specification

## Purpose and agreed scope
Polish storefront for small-batch, hand-decorated trousers. Warm/tactile/confident. Material and visible making persuade through specifics. Temporary name centralized in shared/brand.json.
Frontend AND durable backend now; payments deferred. Prepare a server payment adapter boundary, never fake card forms or paid status. Deliver source to GitHub, no deployment.

## Routes
Home /; filterable /shop; /shop/:slug; editable /cart; /checkout; protected /order-confirmation; /process; /journal and /journal/:slug; /faq; /size-guide; /contact; /terms; /privacy; /shipping-returns; /404 and unknown-path recovery. Preserve /collection, /collection/:slug and /atelier aliases.
Home pairs asymmetric garment/process visuals. Shop filters material/technique/size with reset and empty state. Detail includes full, detail and illustrative process gallery; care, measurements, variants and sample lead time.

## Data and architecture
Retain React19/Vite/TypeScript, GSAP/Lenis, R3F. Node24 HTTP API plus SQLite on durable disk. Development launches API+Vite together; production Node serves built SPA and API on one origin. Static-only hosting is insufficient.
Shared demo catalog defines integer grosz, variants, sizes, drape/sheen/weave, madeToOrder=true. All initial items are made to order; stock-backed items rejected until inventory transactions exist.
POST /api/quote canonicalizes lines and shipping and returns totals/fingerprint. POST /api/orders validates customer/address/acknowledgement/quote and transactionally records a snapshot. Status awaiting_arrangement; payment not_requested. Idempotency keys return the same order on retry and reject conflicting payloads. GET /api/orders/:id needs a private bearer token (hash only in DB). No public order list; local owner CLI.
Contact and newsletter requests persist separately. Newsletter is pending confirmation, not an active mailing integration.
Limit cart 20 lines/10 units per variant; reject duplicate/unknown variants. Bound JSON body, strings and requests; prepared SQL; explicit trusted origin for writes; security headers; bounded rate limiter. No DB/secrets in git/static output. Demo mode default and marked. Live mode requires seller/contact/returns data, approved policy version and HTTPS origin.

## Checkout
Size/variant → cart → server quote → contact/address/Poland shipping or pickup → acknowledge unpaid request → persisted server receipt. Quote mismatch/offline failures preserve inputs. Clear cart only on success. Ambiguous failures preserve exact request/key in the current tab for retries; private receipt key stays tab-local. No PII/token in URLs. No auto email or production acceptance.
Future payments derive amount from stored order, use provider idempotency, verify signed webhooks and update status atomically. Redirect alone cannot mark paid. No provider selected now.

## Content and legal
Photography is generated demonstration imagery, not proof of real craft. Prices, measurements, 10–15-day lead times and product details are fixtures needing approval. No invented studio location or certifications.
Policies explicitly draft: seller identity/returns address/legal review needed. Made after order does not automatically eliminate withdrawal; personalized-goods exceptions require assessment. Complaint rights remain. Cite UOKiK sources in policy. Privacy identifies storage/copies/recipients/retention decisions and rights; no analytics.
Before public launch replace fixtures/photos, approve policies and configure real identity/hosting backups/retention.

## Quality
WCAG2.2AA target: semantic headings, keyboard controls, visible focus, overlay trap/restoration, route announcements, form labels/errors, reduced-motion alternatives. Renderer/chunk/context failures preserve DOM. Responsive local images reserve dimensions; eager hero, lazy secondary imagery; WebGL outside initial bundle.
Regression tests: all routes, filters, cart normalization/persistence, variants/fallback, authoritative pricing, malformed input, quote mismatch, idempotency/conflicts, protected receipt, persistence on reopen, contacts/consent, origin/rate/body limits and no-payment adapter. Palette audit reads CSS. Build plus tests are not browser certification.
