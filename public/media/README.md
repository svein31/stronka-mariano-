# Development imagery — replace before launch

All four images were generated with OpenAI image generation for this prototype, 7 September 2026. They are conceptual placeholders, not photographs of actual products, people or a real workshop.

- botanika: ecru wide-leg cotton trousers with hand-block-style cobalt botanical leaves on a worktable.
- gest: indigo wide-leg cotton trousers with freehand cream brush lines.
- forma: natural linen trousers with clay and blue stencil shapes.
- process: anonymous adult hands applying a cobalt botanical block print to an ecru trouser leg; studio worktable and pigment tray.

No reference brand assets were used. The process image is general inspiration, not documentation of every garment's printing technique. The detail view crops the same development photograph.

Replace each slot with approved real photography in .webp plus -480.webp and -960.webp derivatives. The primary descriptor is 1086w for product slots and 1440w for process. Preserve composition/aspect ratios (product frames 3:4; process 3:2), or update PhotoPlate's reserved dimensions. Existing slots probe a .jpg if WebP fails; remove the WebP files to use a JPG. Update alt text in shared/catalog.json and process/journal copy as needed. Remove demo captions only when the new assets represent actual products.

## White studio variants — cinematic redesign

The three -studio slots are OpenAI built-in image edits of the original generated trousers. Used on product cards, galleries and cart thumbnails. The original worktable images remain available for editorial/material sections. All images remain development illustrations.

Prompt (one request for each original): extract only the existing trousers onto a pure-white seamless studio background with a subtle soft shadow; preserve print placement, colors, cut, waistband and material; show the complete waistband and hems with white margins; remove table and props; no text/logos/people. Input targets were botanika.webp, gest.webp and forma.webp.

Final paths: public/media/botanika-studio.webp, gest-studio.webp, forma-studio.webp, each with -480 and -960 WebP variants and a 1086px main image. These are background edits, not verified documentary photos.
