---
name: SUMI
description: An avant-garde atelier in the monastic Japanese lane. Cloth, ink, and air.
colors:
  sumi-void: "oklch(0.13 0.006 265)"
  sumi: "oklch(0.175 0.008 265)"
  sumi-lift: "oklch(0.225 0.010 265)"
  sumi-line: "oklch(0.34 0.012 265)"
  washi: "oklch(0.962 0.006 90)"
  washi-deep: "oklch(0.905 0.010 88)"
  washi-line: "oklch(0.76 0.012 88)"
  kin: "oklch(0.745 0.055 88)"
  shu: "oklch(0.572 0.185 30)"
  shu-lift: "oklch(0.645 0.165 30)"
  shu-deep: "oklch(0.455 0.155 30)"
  ai: "oklch(0.34 0.065 258)"
typography:
  display:
    fontFamily: "Shippori Mincho, Hiragino Mincho ProN, serif"
    fontSize: "clamp(3rem, 13vw, 12rem)"
    fontWeight: 600
    lineHeight: 0.92
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Shippori Mincho, Hiragino Mincho ProN, serif"
    fontSize: "clamp(2rem, 5.5vw, 4.5rem)"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-0.01em"
  vertical:
    fontFamily: "Shippori Mincho, Hiragino Mincho ProN, serif"
    fontSize: "clamp(1.5rem, 3.4vw, 2.75rem)"
    fontWeight: 500
    lineHeight: 1.85
    letterSpacing: "0.14em"
  body:
    fontFamily: "Zen Kaku Gothic New, Hiragino Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 300
    lineHeight: 1.75
    letterSpacing: "0.005em"
  label:
    fontFamily: "Zen Kaku Gothic New, Hiragino Sans, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.22em"
rounded:
  none: "0px"
  seal: "2px"
spacing:
  hair: "1px"
  xs: "0.5rem"
  sm: "1rem"
  md: "2rem"
  lg: "clamp(4rem, 9vw, 9rem)"
  xl: "clamp(7rem, 16vw, 17rem)"
  movement: "clamp(9rem, 22vw, 24rem)"
components:
  button-primary:
    backgroundColor: "{colors.washi}"
    textColor: "{colors.sumi}"
    rounded: "{rounded.none}"
    padding: "1.125rem 2.75rem"
  button-primary-hover:
    backgroundColor: "{colors.shu-deep}"
    textColor: "{colors.washi}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.washi}"
    rounded: "{rounded.none}"
    padding: "1.125rem 0rem"
  button-ghost-hover:
    textColor: "{colors.shu-lift}"
  seal:
    backgroundColor: "{colors.shu}"
    textColor: "{colors.washi}"
    rounded: "{rounded.seal}"
    size: "clamp(3.5rem, 5vw, 4.75rem)"
  lookbook-plate:
    backgroundColor: "{colors.sumi-lift}"
    rounded: "{rounded.none}"
  spec-row:
    backgroundColor: "transparent"
    textColor: "{colors.washi}"
    padding: "1.25rem 0rem"
  input-field:
    backgroundColor: "transparent"
    textColor: "{colors.washi}"
    rounded: "{rounded.none}"
    padding: "0.875rem 0rem"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.washi}"
    typography: "{typography.label}"
    padding: "0.5rem 0rem"
  nav-link-active:
    textColor: "{colors.shu-lift}"
---

# Design System: SUMI

## 1. Overview

**Creative North Star: "An emakimono unrolling in a dark room."**

The site is a picture scroll (絵巻物), not a stack of pages. The visitor unrolls one continuous
composition, and every movement of the scroll alternates between two physical states: sumi ink
and washi paper. Dark movements carry the drama, the WebGL, and the display type at architectural
scale. Light washi movements arrive as relief, the way a printed plate interrupts a field of
handwritten ink. That alternation is the site's rhythm and its primary structural device.

Density is deliberately near zero. The void is the material, not leftover space. A typical
viewport holds one subject and one line of type. Type is set at extremes: mincho display faces
cropped by the viewport edge so they read as architecture rather than as headlines, against
gothic body copy at 300 weight that is almost whispering. Vertical composition (tategaki,
`writing-mode: vertical-rl`) is used at decisive moments because a Japanese picture scroll is
natively read top-to-bottom, right-to-left, and setting mincho vertically is the culturally
correct move rather than an exotic flourish.

Motion is choreographed and unhurried. Reveals run 0.9s to 1.4s on exponential ease-out curves.
Scroll drives the composition directly: pinned sequences, scrubbed clip-path reveals, and layered
parallax that makes the ink washes sit behind the cloth. The vermilion hanko seal stamps at
scroll milestones, which is the only moment of impact in an otherwise slow system.

This system explicitly rejects glossy centered e-commerce, hero carousels with dots, equal
three-card grids, and "SHOP NOW" pills. It rejects streetwear neon and drop-culture urgency. It
rejects the editorial-magazine reflex of European didone italics with drop caps and ruled
broadsheet columns: this house is Kyoto and Tokyo, not Milan and New York. It rejects heritage
warmth applied as costume, and it rejects crypto dark mode, which is near-black plus one
saturated neon accent. Nothing here apologizes for its own emptiness by filling it.

**Key Characteristics:**
- Ink-drenched dark movements alternating with washi paper reliefs
- Mincho display at architectural scale, cropped by the viewport, set upright and sometimes vertically
- Zero radius almost everywhere; sharp edges are the tailoring
- Hairline structure rather than shadows; depth comes from ink wash and parallax, not elevation
- One vermilion seal as the only saturated moment, used under two percent of any screen
- Procedural WebGL cloth and warp threads; no rendered product assets required

## 2. Colors

A sumi-e ink palette: two papers, four inks, one aged gold hairline, and a single vermilion seal.
Strategy is **Drenched**. The surface IS the ink.

### Primary
- **Sumi Ink** (`{colors.sumi}`): The dominant surface. Carries the hero, the pinned craft
  sequence, the navigation shell, and the product detail page. Never pure black; tinted toward
  hue 265 so it reads as ground ink on paper rather than as a screen turned off.
- **Sumi Void** (`{colors.sumi-void}`): The deepest ground. Used behind WebGL scenes and in the
  full-bleed scroll transitions where ink washes out to nothing. The 3D cloth fades into this.
- **Washi** (`{colors.washi}`): The paper relief. Whole movements of the scroll flip to this
  surface, plus all primary buttons and all body text on ink. Never pure white; warmed toward
  hue 90 like kozo paper.

### Secondary
- **Sumi Lift** (`{colors.sumi-lift}`): Raised surface on ink. Lookbook plates, the cart drawer,
  open navigation panels.
- **Ai Indigo** (`{colors.ai}`): Depth only. Shadows inside the 3D cloth, the underside of a
  fold, the dye vat reference in the atelier movement. Never a text color, never a UI fill.

### Tertiary
- **Kin Aged Gold** (`{colors.kin}`): Hairlines, rules, index numerals, and secondary labels on
  ink. Reads as gold leaf that has oxidized, not as luxury metallic.
- **Shu Vermilion** (`{colors.shu}`): The hanko seal and nothing else. Square, 2px radius,
  stamped. Measures 4.34:1 against washi, which clears AA for large text and nothing else, so it
  is a graphic fill only and never a text surface.
- **Shu Lift** (`{colors.shu-lift}`): Vermilion as text on ink. 5.34:1 against `{colors.sumi}`
  and 5.66:1 against `{colors.sumi-void}`, both clearing AA for body copy.
- **Shu Deep** (`{colors.shu-deep}`): Vermilion as a text-carrying surface and vermilion as text
  on paper. Dried seal paste rather than wet. 7.05:1 against washi in both directions, which is
  AAA. This is the primary button hover fill and the accent on every washi movement.

Every figure in this section is measured, not estimated. `node scripts/audit-palette.mjs`
recomputes them from the tokens, fails the build if any documented pair falls below its stated
requirement, and emits the sRGB equivalents the WebGL shaders consume.

### Neutral
- **Sumi Line** (`{colors.sumi-line}`): Hairline borders and dividers on ink. 1px only.
- **Washi Deep** (`{colors.washi-deep}`): Shadow tone on paper movements; the pressed state of a
  paper surface.
- **Washi Line** (`{colors.washi-line}`): Hairline borders and dividers on paper.

### Named Rules
**The Seal Rule.** Vermilion appears on at most one element per viewport and never as a
background covering more than the seal itself. Its rarity is the entire point. Two vermilion
objects on screen at once is a bug.

**The No-Neon Rule.** Nothing in this palette exceeds chroma 0.185. Ink plus one saturated neon
accent is crypto dark mode, which PRODUCT.md names as an anti-reference. If a color reads as
glowing, it is wrong.

**The Tint Rule.** No `#000` and no `#fff` anywhere, including in gradients, shadows, masks, and
SVG fills. Every neutral is tinted: inks toward hue 265, papers toward hue 90.

**The Vermilion Text Rule.** `{colors.shu}` never carries text at any size and never sits under
text at any size. Vermilion as text on ink is `{colors.shu-lift}`. Vermilion as text on paper, or
as a fill carrying a label, is `{colors.shu-deep}`. These are measured contrast constraints, not
taste preferences, and the three values are not interchangeable.

## 3. Typography

**Display Font:** Shippori Mincho (with Hiragino Mincho ProN, then generic serif)
**Body Font:** Zen Kaku Gothic New (with Hiragino Sans, then generic sans-serif)
**Label/Mono Font:** None. Zen Kaku Gothic New at 500 weight with 0.22em tracking carries labels.

**Character:** A genuine Japanese pairing rather than a European fashion pairing. Mincho has thin
horizontal strokes terminating in triangular serifs, a rhythm derived from brush and woodblock
rather than from a chisel, so it reads as Kyoto at any size. Gothic is the neutral, machined
counterpart used for everything functional. Neither family is italicized at any point: mincho has
no italic and inventing one with a synthetic oblique would destroy the drawing.

### Hierarchy
- **Display** (600, `clamp(3rem, 13vw, 12rem)`, 0.92): The architectural face. Set so tightly
  cropped by the viewport that only part of a word may be visible at rest. Hero, movement
  openers, the manifesto.
- **Headline** (500, `clamp(2rem, 5.5vw, 4.5rem)`, 1.08): Section titles and product names.
  Upright, unhurried tracking.
- **Vertical** (500, `clamp(1.5rem, 3.4vw, 2.75rem)`, 1.85, 0.14em tracking): Tategaki
  composition via `writing-mode: vertical-rl`. Reserved for the manifesto, atelier pull quotes,
  and the scroll's spine labels. Generous line-height because vertical mincho needs air between
  columns.
- **Body** (300, `1rem`, 1.75): All prose. Capped at 62ch. Never justified. On ink, add 0.05 to
  line-height because light type reads as lighter weight.
- **Label** (500, `0.6875rem`, 1.4, 0.22em tracking, uppercase): Navigation, index numerals,
  spec keys, filter chips, the media manifest slot names.

### Named Rules
**The No-Italic Rule.** Synthetic oblique is prohibited on both families. Emphasis comes from
scale, weight, and color. Never `font-style: italic`, never `font-synthesis` fakery.

**The Vertical-Only-For-Voice Rule.** Tategaki is used where the scroll's own logic calls for it:
spine labels, the manifesto, pull quotes. It is never used for body copy, forms, prices, or
anything a visitor must read quickly. Vertical text that must be parsed is hostile.

**The Two-Extremes Rule.** Every composition pairs the largest available display size against the
smallest available label size. Intermediate sizes are transitional and should not dominate a
viewport. The ratio between hierarchy steps never falls below 1.25.

## 4. Elevation

This system uses no drop shadows for elevation. Depth is produced by three other means: ink wash
(bokashi) gradients inside surfaces, parallax layering that separates planes in z, and tonal
steps between `{colors.sumi-void}`, `{colors.sumi}`, and `{colors.sumi-lift}`. Hairlines at
`{colors.sumi-line}` and `{colors.washi-line}` do all the structural work a shadow would
otherwise do.

The single exception is the cart drawer and the open navigation panel, which overlay content and
therefore require separation from the page beneath them.

### Shadow Vocabulary
- **Overlay** (`box-shadow: -1px 0 0 0 var(--sumi-line), -40px 0 120px -40px oklch(0.08 0.004 265 / 0.9)`):
  Cart drawer and navigation panel only. The hairline does the defining; the wash merely seats it.

### Named Rules
**The Flat-By-Default Rule.** Every surface is flat at rest. If a card needs a shadow to be
legible, the composition is wrong, not the shadow budget.

**The Hairline-Not-Shadow Rule.** Separation is a 1px `{colors.sumi-line}` or
`{colors.washi-line}` hairline. Never a border thicker than 1px and never a colored
`border-left` or `border-right` accent stripe.

## 5. Components

### Buttons
- **Shape:** Sharp, no radius (`{rounded.none}`). Tailoring, not softness.
- **Primary:** Washi fill on sumi ground, sumi text, `1.125rem 2.75rem` padding, label typography
  (500 weight, 0.22em tracking, uppercase). A 1px washi border so it survives on washi movements.
- **Hover / Focus:** Fill transitions to `{colors.shu-deep}` over 420ms on an exponential ease-out
  while text stays washi, holding 7.05:1 throughout the transition. Focus shows a 1px
  `{colors.kin}` outline offset 4px, never a browser default ring. The fill sweeps up from the hem
  on a transform rather than cross-fading, so no layout property is animated.
- **Ghost:** No fill, no border, washi text, underline drawn from left to right on hover via a
  `scaleX` transform on a 1px pseudo-element (not `text-decoration`, not a layout property).
  Hover text goes to the semantic accent, which resolves to `{colors.shu-lift}` on ink and
  `{colors.shu-deep}` on paper.

### Chips
- **Style:** Transparent fill, 1px `{colors.sumi-line}` border, label typography, zero radius.
  Used for collection filters (All, Outerwear, Knitwear, Trousers, Cloth).
- **State:** Selected inverts to washi fill with sumi text and a `{colors.shu}` 1px bottom edge
  marker. Unselected stays washi text at 60 percent opacity. Transition 300ms.

### Cards / Containers
- **Corner Style:** Zero radius, always.
- **Background:** `{colors.sumi-lift}` for lookbook plates on ink movements; `{colors.washi-deep}`
  for plates on paper movements.
- **Shadow Strategy:** None. See the Flat-By-Default Rule.
- **Border:** Hairline only, and only when the plate sits on a matching-tone ground.
- **Internal Padding:** `{spacing.md}` inside plates; lookbook plates bleed their image edge to
  edge with metadata set below on the ground, never inside a padded inner box. Nested plates are
  prohibited.

### Inputs / Fields
- **Style:** No box. A single 1px `{colors.sumi-line}` underline on transparent ground,
  `0.875rem 0` padding, zero radius. Label sits above in label typography.
- **Focus:** Underline scales from `scaleX(0.2)` to `scaleX(1)` in `{colors.shu}` over 380ms,
  origin left. No glow, no box.
- **Error / Disabled:** Error text in `{colors.shu-lift}` at body size with the underline held
  solid. Disabled drops opacity to 38 percent and removes the focus transition.

### Navigation
- Fixed shell, label typography, washi text, transparent ground that gains a
  `{colors.sumi-void}` scrim at 82 percent opacity once the visitor leaves the first fold.
- Wordmark is SUMI with the 墨 seal mark adjacent, set in display weight.
- Hover reveals a 1px `{colors.kin}` underline scaling from left. Active route uses
  `{colors.shu-lift}` text with a stamped seal glyph, not a pill or a filled tab.
- Mobile: a full-viewport `{colors.sumi-void}` panel, routes set as vertical display type,
  staggered in at 70ms intervals. Focus is trapped while open and restored on close.
- A scroll progress hairline in `{colors.kin}` runs the width of the viewport under the shell,
  scaled by `transform: scaleX()`.

### The Hanko Seal (signature component)
A square vermilion block, `clamp(3.5rem, 5vw, 4.75rem)`, 2px radius, carrying the 墨 glyph in
washi at display weight. It is a real object in this system, not decoration: it stamps at scroll
milestones with a 260ms scale from 1.35 to 1 on an exponential ease-out plus a 0.06 opacity
flicker, exactly the way a seal lands on paper. It appears at the end of each movement and in
the footer. It never appears twice in one viewport.

### The Ink Plate (signature component)
The image container for all photography. It renders a supplied asset from `public/media/` and,
until that asset exists, renders a procedurally generated bokashi wash in SVG that is unique per
slot and labelled with the slot name in label typography at 40 percent opacity. A plate is never
an empty gray box and never a broken image icon. Real assets resolve automatically on drop-in.

## 6. Do's and Don'ts

### Do:
- **Do** alternate ink and washi movements. A scroll that stays dark for more than three
  consecutive movements has lost its rhythm.
- **Do** set display mincho large enough to be cropped by the viewport. `clamp(3rem, 13vw, 12rem)`
  is the floor, not the ceiling.
- **Do** use `writing-mode: vertical-rl` for spine labels, the manifesto, and pull quotes.
- **Do** keep every radius at 0 except the seal, which is 2px.
- **Do** separate with 1px hairlines in `{colors.sumi-line}` or `{colors.washi-line}`.
- **Do** run reveals on exponential ease-out at 0.9s to 1.4s. Use `expo.out`, `power4.out`, or
  `quint.out`.
- **Do** give every dramatic moment a composed static equivalent under `prefers-reduced-motion`.
- **Do** treat WebGL as enhancement. The complete brand experience must survive without it.
- **Do** write alt text as a description of the garment as an object, in the brand voice.
- **Do** cap body copy at 62ch and add 0.05 to line-height when it sits on ink.

### Don't:
- **Don't** use `#000` or `#fff` anywhere, including gradients, masks, and SVG fills.
- **Don't** use `{colors.shu}` as a text color or as a fill beneath text at any size. Use
  `{colors.shu-lift}` on ink and `{colors.shu-deep}` on paper. That is a contrast failure.
- **Don't** put two vermilion objects in one viewport.
- **Don't** apply synthetic italic or oblique to either family.
- **Don't** use `border-left` or `border-right` thicker than 1px as a colored accent stripe.
- **Don't** use gradient text (`background-clip: text` over a gradient).
- **Don't** use glassmorphism or backdrop blur as a default surface treatment.
- **Don't** build a hero-metric block: big number, small label, supporting stats, gradient accent.
- **Don't** lay out identical card grids with icon plus heading plus text repeated endlessly.
- **Don't** reach for a modal before exhausting inline and progressive alternatives.
- **Don't** build glossy centered e-commerce: hero carousels with dots, "SHOP NOW" pills, or a
  newsletter modal on arrival.
- **Don't** add streetwear noise: neon drench, glitch as decoration, or drop-culture urgency.
- **Don't** drift into the editorial-magazine reflex: European didone italics, drop caps, ruled
  broadsheet columns, lowercase tracked metadata everywhere.
- **Don't** apply heritage warmth as costume: leather, brass, sepia, rustic grain.
- **Don't** ship crypto dark mode: near-black plus one saturated neon accent.
- **Don't** fill a gap. If a section can lose an element and gain authority, lose it.
- **Don't** animate layout properties. Transform and opacity only.
- **Don't** use bounce or elastic easing anywhere in this system.
