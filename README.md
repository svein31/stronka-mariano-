# SUMI

React / Vite application for the atelier described in `PRODUCT.md` and `DESIGN.md`.

## Development

Use Node.js 22.12 or newer, then:

```sh
npm ci
npm run dev
```

```sh
npm run build
npm run audit:palette
node --test scripts/regression.test.mjs
```

Production output is `dist/`. The host must rewrite application routes to `index.html` for direct visits to collection and journal entries. Missing `/media/` assets should return 404 rather than the app document.

## Routes and content

- `/`: opening cloth study, featured garment, sewing, collection continuation.
- `/collection`: sequential garment movements; `?c=outerwear` and the other categories filter the document.
- `/collection/:slug`: garment, size and colour selection, composition, construction, care and optional cloth study.
- `/atelier`: the existing five making steps and appointment details.
- `/journal` and `/journal/:slug`: the existing notes and full articles.
- Unknown destinations render a recovery link and a focusable page title.

Content and prices come from the existing `src/data/` files. The bag persists on this device and prepares an email enquiry using the existing atelier contact. It does not process payments, reserve stock, or confirm availability. Published contact details and garment information still require the atelier's approval.

## Progressive enhancement

The document is rendered before optional 3D modules are requested. `ClothStudy` conditionally imports them only when the central capability policy permits WebGL 2 and motion. Reduced motion, the in-page pause control, unsuitable hardware, chunk errors, renderer errors and context loss retain the underlying text and material specifications. Canvas loops pause offscreen and in hidden tabs. The swatch has a labelled keyboard-operable range input; its control disappears if the renderer fails.

Navigation and bag dialogs trap focus, make background content inert, close with Escape and restore focus. Route navigation waits until the veil clears before focusing the new heading. Pausing motion does not reset the visitor's scroll position. GSAP and Lenis resources are cleaned up when the scroll layer changes.

Photography is **not present in this repository**. `InkPlate` now attempts the registered JPG and WebP filenames and renders an explicitly labelled ink-wash fallback if neither exists. Supply the actual photographs in `public/media/` using the slots and dimensions in `src/lib/media.ts`. Reload after adding assets, because failed probes are cached for the session. Product photographs retain their original colour and are not generated substitutes for garment evidence.

## Validation scope

The regression suite checks static output for every declared page, unknown routes, filtering, essential product information, the image-loading fallback, motion budgets, WebGL 2 gating persisted bag normalization and the production entry graph’s separation from Three.js. The palette audit checks the 18 existing documented colour pairs.

These checks are not a full WCAG 2.2 AA certification. Before release, review the supplied photography and run browser, keyboard and screen-reader checks, including:

- 320 CSS-pixel width, 200% text enlargement and mobile menu resizing.
- OS reduced motion before load and toggled during navigation; pause/resume midway through the scroll.
- WebGL disabled, failed lazy chunks, renderer creation failure and `WEBGL_lose_context` during a cloth study.
- Tab, Shift+Tab, Escape and focus restoration in both dialogs; route back/forward restoration.
- Size selection, colour changes, adding/removing bag lines and reloading a saved bag.

No hosting configuration or production deployment is created by this change.
