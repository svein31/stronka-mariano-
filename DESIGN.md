# Handmade trousers — cinematic dark / liquid glass

## Confirmed direction
The latest brief supersedes the warm serif/worktable interface. Use an athletic editorial rhythm: full-bleed photographic story, huge left-aligned condensed sans type, then a deliberate cut to a white product stage. Borrow scale and confidence from the Nike reference, never its marks, slogans, assets or identity. Handmade fabric and printing remain the subject; no invented workshop history. Temporary name in shared/brand.json.

## Color and contrast
| Token | Hex | Purpose |
| --- | --- | --- |
| night | #0c0d10 | Story, journal, page background |
| panel | #1a1c22 | Solid dark reading surfaces |
| canvas | #ffffff | Product stages and inverse text |
| ecru | #f0f1f2 | Neutral solid form/summary background; legacy token name retained |
| charcoal | #101114 | Text on white and accent |
| muted | #555b65 | Secondary text on white |
| muted-inverse | #b8bcc4 | Secondary text on dark |
| accent | #d6ff3f | Single lime action/highlight color |
| line | #707780 | Visible control boundaries |
| glass-worst | #1c1d20 | Conservative lightest glass background |
| story-worst | #2f3032 | Conservative lightest photographic copy scrim |

Measured sRGB pairs: white/night 19.43, muted-inverse/night 10.21, charcoal/white 18.88, muted/white 6.84, charcoal/accent 16.39, white/glass-worst 16.85, muted-inverse/glass-worst 8.85, line/white 4.53. Audit both light and dark text pairs, control boundaries, photo scrims and black/white extremes behind glass. Minimum regular text 4.5, boundaries 3.
Lime is never small text on white. Focus uses lime on dark, charcoal on white; selection has text/border as well as color. Errors use bold text, explicit messages and a border rather than introducing another accent.
Fabric shader blue and garment tints belong to the product material, not the interface palette.

## Typography / geometry
Headlines: Impact, Haettenschweiler, Arial Narrow, Arial Black, sans-serif; uppercase, weight 900, line-height 1.02, tracking -.035em. System fonts keep Polish fallback and avoid a font download. Hero clamp(3.5rem,10.5vw,10rem), page display clamp(3rem,7vw,7rem), section heading clamp(2.5rem,5vw,5rem). Body Arial/Helvetica sans, 1rem/1.7; labels .875rem; captions .75rem. No clipped letters or outline-only essential text.
Shell 1440px; reading 62ch; gutters clamp(1.25rem,4vw,4rem). Sections 4–8rem. Hero fills approximately one viewport but grows with content and zoom. Product stages are white edge-to-edge. Story copy has a bounded solid-backed area, not a washed-out photo.

## Components
- CinematicHero: full-bleed process image, scrim-backed left title, two distinct navigation choices. Desktop GSAP pins only with adequate viewport height and rich-effects capability. Static/mobile shows the complete composition without pinning.
- ProductStage / ProductCard: white background and white studio product shot, full silhouette, realistic soft shadow. Technique, price and lead time. Detail hover and explicit touch gallery.
- GlassSurface: sticky navigation, filter/sort bar and cart drawer only. Base is solid night. Enhanced background rgba(12,13,16,.94) means contrast never relies on blur; edge glint moves through transform/opacity. Backdrop blur is a fixed value, never animated.
- MagneticCTA: Motion spring hover/press only here, bounded 5px translation and 1.015 scale. Static on reduced motion/low tier and on transactional paths.
- Filters: native labelled material, print, size and sort controls with URL state/reset/count/empty state. Motion owns product position transitions; GSAP never animates those same nodes.
- Drawer/menu: preserve keyboard trap, Escape, background inert and focus restoration. Motion owns open/close transforms. Closed panels are inert and aria-hidden immediately.
- Checkout, receipt, long product/care/legal copy: solid high-contrast surfaces; no glass, parallax or magnetic responses. The existing server-verified unpaid flow remains.
- Footer: solid dark, help/legal links and quiet newsletter.

## Motion division and fallbacks
GSAP/ScrollTrigger + Lenis own pinned story beats, scrubbed CSS perspective/translateZ layers and optional cloth camera travel. Framer Motion (Motion for React) owns discrete hover/press, drawer/menu and product filtering/sorting. Never let both engines own the same transform.
Retain the existing printed cotton/linen procedural cloth as the signature 3D moment; use genuine mesh rotation and camera dolly, not just image scaling. Static photos/descriptions remain outside Canvas.
Only animate transform/opacity. Glass highlight translates; fixed blur layers fade with their panel. No blur interpolation or layout-property tweens. Motion layout uses transform projection.
Reduced motion / in-page pause: no pin, no parallax, no 3D, no blur, no spring; content fully visible. Low-end/coarse-pointer/save-data devices: no 3D and no backdrop blur, no pinned scene; lightweight reveal only. Default SSR is conservative.
Full pinning, parallax and 3D are desktop-only and require explicit session opt-in until physical mid-range-device profiling is complete. Eligible desktops receive lightweight glass with a fixed 8px blur independently of this switch; reduced transparency disables that blur. Ship the useful composed path by default. Enabling cannot override reduced motion, low hardware tier or save-data; missing WebGL always prevents the cloth renderer.
Real-phone performance has not been measured in this environment. Browser/device QA remains an explicit release gate; do not present SSR tests as profiling.

## Do / don't
Do alternate dark story and white products, expose process immediately, keep one accent, genuine product detail, visible focus and dimensions.
Don't copy Nike branding, invent provenance, add countdowns or false scarcity, place glass on forms/prose, hide essentials behind animation, claim payment or email success, or enable the full mobile effect without device evidence.
