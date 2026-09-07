# Handmade trouser workshop — design system

## Direction
Warm, tactile, quietly confident. The interface is a worktable; product prints supply the colour. Left-aligned serif type beside offset garment photography; interrupt product groups with actual making. Polish copy. Temporary brand name only in shared/brand.json. No invented atelier history or provenance.

## Tokens and measured WCAG ratios
| Token | Hex | Role | On canvas / ecru |
| --- | --- | --- | --- |
| canvas | #f5f1e8 | Main ground / inverse text | — |
| ecru | #e8e0d2 | Secondary ground | — |
| charcoal | #292b27 | Text and footer | 12.68 / 10.91 |
| muted | #606157 | Supporting text | 5.57 / 4.79 |
| indigo | #344b64 | Action/focus/selection | 7.97 / 6.86 |
| clay | #914f38 | Error/editorial accent | 5.51 / 4.74 |
| line | #77766b | Control boundaries only | 4.06 / 3.49 |

Ratios use sRGB relative luminance. Minimum text 4.5, charcoal 7, boundary 3. Inverse button/footer ratios are identical. Dark sections use canvas text. Audit reads actual CSS and checks shader mapping.

## Type and rhythm
Georgia display, Trebuchet MS/Arial body: warm system fonts, Polish glyphs, no font download/shift. Display clamp(3rem,7.7vw,7.5rem)/1.04, tracking -.055em; headlines clamp(2rem,4.5vw,4.5rem)/1.1; titles 1.5–2rem; body 1rem/1.75; labels .875rem minimum, metadata .75rem minimum. Never crop meaningful text.
Spacing .5/1/1.5/2/3rem; sections clamp(4rem,8vw,8rem); gutter clamp(1rem,4vw,4rem). Shell 1440px, prose 62ch. Single column below 48rem, wrapping controls at 320px/200% text zoom. Only measurement tables may scroll horizontally.

## Components
- WorkshopSection: semantic canvas/ecru/charcoal section, horizontal labels, no cultural ornament.
- PhotoPlate: aspect-ratio reserved; local responsive WebP/JPEG candidates; no desaturation. Missing image gets material-toned labelled fallback; never broken icon. Generated imagery identified in captions and public/media/README.md.
- ProductCard: garment, name, material/technique, price, made-to-order flag. Detail crossfade on hover/focus; touch users get explicit gallery controls.
- Button: rectangular, radius 2px max, 44px target. Indigo/canvas primary. Label translates 2px on hover. Loading prevents duplicate submits.
- Field: persistent visible label, 1px line border, 44px height; native controls, text errors with aria-describedby. Selected state is text plus colour.
- Navigation: opaque canvas; wordmark, shop/process/journal, cart count. Reuse mobile focus trap, background inert, Escape, restoration. Keep motion pause.
- CartDrawer: thumbnails, variants, editable quantities, remove, subtotal, checkout. /cart is fully functional too.
- Checkout: contact/delivery/review, server quote, explicit unpaid request. Preserve inputs on failure; retry ambiguous requests with the same key.
- Receipt: server data with private tab-local access token; no token or PII in URL. No payment-success fiction.
- Footer: help, legal, quiet optional newsletter. No arrival modal or invented email delivery.

## Motion
Preserve GSAP/Lenis and procedural R3F cloth. Cotton/linen and indigo printed material study, clearly illustrative. Photography/specifications remain outside canvas. Lazy load near viewport, stop offscreen/hidden, preserve geometry budgets and renderer fallback.
Reveals 24–40px/.7–1s power4.out; parallax ±24px max; product opacity 350ms; brief transform-only route veil, bypass transactional paths. Only transform/opacity: no animated clip-path, layout or filters. No bounce. CSS does not hide content initially. Reduced motion/pause restores complete static content.

## Do / don't
Do show product/detail/process, preserve print colour, give measurements and lead times, use integer-grosz prices, 2px indigo focus and inverse canvas focus.
Don't use countdowns, fake stock urgency, glass, gradient text, generic icon cards, glossy round surfaces, Japanese branding or invented provenance. Don't claim a request is paid or accepted for production. Don't publish draft legal data.
