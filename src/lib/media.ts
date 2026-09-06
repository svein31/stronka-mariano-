/* ==========================================================================
   Media slots.

   Photography is supplied by the client. This module is the single source of
   truth for every image slot in the site, and public/media/MANIFEST.md is
   generated from it. Add a slot here and it appears in the manifest.

   Drop assets into public/media named exactly `<slot>.jpg` or `<slot>.webp`.
   InkPlate probes for them once, caches the result, and renders a composed
   procedural bokashi wash until a real file resolves. Nothing is ever a gray
   box and nothing is ever a broken image icon.
   ========================================================================== */

import type { CSSProperties } from 'react'

export type MediaGroup = 'campaign' | 'lookbook' | 'garment' | 'journal' | 'atelier'

export interface MediaSlot {
  slot: string
  group: MediaGroup
  purpose: string
  /** CSS aspect-ratio value the plate is composed at. */
  ratio: string
  /** Minimum pixel dimensions to fill that ratio at full bleed. */
  min: readonly [number, number]
  /** Art direction brief for whoever shoots or selects the frame. */
  intent: string
}

const GARMENT_MIN = [1200, 1600] as const
const GARMENT_DETAIL_MIN = [1400, 1750] as const
const EDITORIAL_MIN = [1800, 1200] as const

export const mediaSlots: MediaSlot[] = [
  {
    slot: 'campaign-manifesto',
    group: 'campaign',
    purpose: 'Full-bleed plate behind the manifesto movement.',
    ratio: '2 / 3',
    min: [1400, 2100],
    intent:
      'One figure standing in a bare room with a single high window. Backlit. The garment reads as silhouette only, no face, no styling detail. Dense at the top of the frame, thinning toward the bottom so type can sit over it.',
  },
  {
    slot: 'campaign-ink-cloth',
    group: 'campaign',
    purpose: 'Plate for the cloth movement, paired with the WebGL drape.',
    ratio: '4 / 5',
    min: [1600, 2000],
    intent:
      'Extreme macro of black wool in motion, a single fold catching raking light from the left. No garment shape visible. Should read as landscape rather than as fabric.',
  },
  {
    slot: 'campaign-hem',
    group: 'campaign',
    purpose: 'Closing plate for the collection movement.',
    ratio: '16 / 9',
    min: [2000, 1125],
    intent:
      'A hem mid-swing, shot from below at floor level, motion blur on the cloth and sharp focus at the stitch line. Dark ground, no horizon.',
  },

  {
    slot: 'lookbook-01',
    group: 'lookbook',
    purpose: 'Editorial spread, first look.',
    ratio: '3 / 4',
    min: EDITORIAL_MIN,
    intent:
      'Full length, figure against a plaster wall in shade. Natural light only. Garment unstyled, no accessories, hands out of frame.',
  },
  {
    slot: 'lookbook-02',
    group: 'lookbook',
    purpose: 'Editorial spread, second look.',
    ratio: '3 / 4',
    min: EDITORIAL_MIN,
    intent:
      'Seated on a low wooden bench, knees apart, coat pooling on the floor. Shot straight on at eye level. Let the pooling cloth fill the lower third.',
  },
  {
    slot: 'lookbook-03',
    group: 'lookbook',
    purpose: 'Editorial spread, third look.',
    ratio: '4 / 5',
    min: [1600, 2000],
    intent:
      'Figure walking away down a corridor, backlit from the far end. The silhouette should be readable at 200 pixels wide.',
  },
  {
    slot: 'lookbook-04',
    group: 'lookbook',
    purpose: 'Editorial spread, detail counterpoint.',
    ratio: '1 / 1',
    min: [1800, 1800],
    intent:
      'Close detail: a cuff, a collar, a knot of fringe. Fill the frame edge to edge with cloth. Shallow depth of field.',
  },
  {
    slot: 'lookbook-05',
    group: 'lookbook',
    purpose: 'Editorial spread, fourth look.',
    ratio: '3 / 4',
    min: EDITORIAL_MIN,
    intent:
      'Two figures overlapping in frame, one partly obscured by the other. Monochrome wardrobe, no contrast between them.',
  },
  {
    slot: 'lookbook-06',
    group: 'lookbook',
    purpose: 'Editorial spread, closing look.',
    ratio: '3 / 4',
    min: EDITORIAL_MIN,
    intent:
      'Figure against an open sky or a bare wall at dusk. Low ambient light, longer exposure, slight movement in the cloth.',
  },

  {
    slot: 'garment-nagashi-coat',
    group: 'garment',
    purpose: 'Nagashi Coat, primary plate.',
    ratio: '3 / 4',
    min: GARMENT_MIN,
    intent:
      'Coat hanging open on a figure or a stand, full length visible including the hem fall. Ink black on a dark ground. Light from the upper left.',
  },
  {
    slot: 'garment-nagashi-coat-detail',
    group: 'garment',
    purpose: 'Nagashi Coat, interior seam.',
    ratio: '4 / 5',
    min: GARMENT_DETAIL_MIN,
    intent:
      'Inside of the coat turned to the light, showing the hand-felled seam allowance and the self-faced edge. This is the proof of the unlined claim.',
  },
  {
    slot: 'garment-sashiko-jacket',
    group: 'garment',
    purpose: 'Sashiko Work Jacket, primary plate.',
    ratio: '3 / 4',
    min: GARMENT_MIN,
    intent:
      'Jacket front open, flat or on a figure, yoke stitching clearly legible. Indigo should read as deep blue with visible tonal variation at the folds.',
  },
  {
    slot: 'garment-sashiko-jacket-detail',
    group: 'garment',
    purpose: 'Sashiko Work Jacket, stitch macro.',
    ratio: '4 / 5',
    min: GARMENT_DETAIL_MIN,
    intent:
      'Macro of the running stitch at roughly four stitches per centimetre. The irregularity of the spacing is the subject of the frame.',
  },
  {
    slot: 'garment-enso-knit',
    group: 'garment',
    purpose: 'Enso Knit, primary plate.',
    ratio: '3 / 4',
    min: GARMENT_MIN,
    intent:
      'Undyed cream knit on a figure, sleeves falling long past the wrist. Light from behind at the shoulder so the mohair halo separates from the ground.',
  },
  {
    slot: 'garment-enso-knit-detail',
    group: 'garment',
    purpose: 'Enso Knit, halo macro.',
    ratio: '4 / 5',
    min: GARMENT_DETAIL_MIN,
    intent:
      'Backlit macro of the loose mohair fibres standing off the surface. Should read as a field of light rather than as a texture.',
  },
  {
    slot: 'garment-habotai-shirt',
    group: 'garment',
    purpose: 'Habotai Shirt, primary plate.',
    ratio: '3 / 4',
    min: GARMENT_MIN,
    intent:
      'Translucent silk against window light so the weave is partly visible. Oversize cut, cuff weighted, sleeve falling straight.',
  },
  {
    slot: 'garment-habotai-shirt-detail',
    group: 'garment',
    purpose: 'Habotai Shirt, French seam.',
    ratio: '4 / 5',
    min: GARMENT_DETAIL_MIN,
    intent:
      'A French seam held up to the light, folded twice, stitched inside itself. Backlit so the doubled fold is visible as a darker line.',
  },
  {
    slot: 'garment-utsuroi-trouser',
    group: 'garment',
    purpose: 'Utsuroi Wide Trouser, primary plate.',
    ratio: '3 / 4',
    min: GARMENT_MIN,
    intent:
      'Framed from hip to floor. Single forward pleat visible, no taper, unturned hem resting on the ground.',
  },
  {
    slot: 'garment-utsuroi-trouser-detail',
    group: 'garment',
    purpose: 'Utsuroi Wide Trouser, selvedge hem.',
    ratio: '4 / 5',
    min: GARMENT_DETAIL_MIN,
    intent:
      'The unfinished hem turned back once to show the selvedge rather than an overlock. Close, raking light.',
  },
  {
    slot: 'garment-ku-tunic',
    group: 'garment',
    purpose: 'Ku Tunic, primary plate.',
    ratio: '3 / 4',
    min: GARMENT_MIN,
    intent:
      'Unbleached flax hanging loose, raw folded collar visible. Raking light so the slub in the hand-loomed weave reads as texture.',
  },
  {
    slot: 'garment-ku-tunic-detail',
    group: 'garment',
    purpose: 'Ku Tunic, raw collar edge.',
    ratio: '4 / 5',
    min: GARMENT_DETAIL_MIN,
    intent:
      'Macro of the unfinished collar edge, folded once, no stitching. The softening of the flax at the fold is the subject.',
  },
  {
    slot: 'garment-kake-wrap',
    group: 'garment',
    purpose: 'Kake Wrap, primary plate.',
    ratio: '3 / 4',
    min: GARMENT_MIN,
    intent:
      'Wrap folded and draped over a low wooden bench, fringe falling clear. Ash grey. Folds should catch soft directional light.',
  },
  {
    slot: 'garment-kake-wrap-detail',
    group: 'garment',
    purpose: 'Kake Wrap, knotted fringe.',
    ratio: '4 / 5',
    min: GARMENT_DETAIL_MIN,
    intent:
      'Close on the hand-knotted fringe in groups of three. Roughly a third of the frame should be knot, the rest falling thread.',
  },
  {
    slot: 'garment-tabi-sock',
    group: 'garment',
    purpose: 'Tabi Sock, primary plate.',
    ratio: '3 / 4',
    min: GARMENT_MIN,
    intent:
      'A pair laid flat and slightly overlapping on a dark ground, split toe facing the camera, reinforced heel visible.',
  },
  {
    slot: 'garment-tabi-sock-detail',
    group: 'garment',
    purpose: 'Tabi Sock, toe division.',
    ratio: '4 / 5',
    min: GARMENT_DETAIL_MIN,
    intent:
      'Macro of the split toe where the two knitted tubes join at the instep. Undyed at the division so the seam reads clearly.',
  },

  {
    slot: 'journal-bokashi',
    group: 'journal',
    purpose: 'Bokashi entry, lead plate.',
    ratio: '3 / 2',
    min: EDITORIAL_MIN,
    intent:
      'Ink wash on paper, dense at the top edge and thinning to bare paper at the bottom with no findable boundary. Shot flat, even light.',
  },
  {
    slot: 'journal-unlined-coat',
    group: 'journal',
    purpose: 'The Unlined Coat entry, lead plate.',
    ratio: '3 / 2',
    min: EDITORIAL_MIN,
    intent:
      'The interior of a coat turned toward a window. Hand-felled seams and self-faced edges in focus, exterior out of focus behind.',
  },
  {
    slot: 'journal-twelve-dips',
    group: 'journal',
    purpose: 'Twelve Dips entry, lead plate.',
    ratio: '3 / 2',
    min: EDITORIAL_MIN,
    intent:
      'Cloth lifted clear of a fermentation vat, still yellow-green before oxidation, dye running back off the hem. Dark room, one light source.',
  },
  {
    slot: 'journal-cutting',
    group: 'journal',
    purpose: 'Cutting Against the Grain entry, lead plate.',
    ratio: '3 / 2',
    min: EDITORIAL_MIN,
    intent:
      'Silk pinned flat on a cutting table with a chalk grain line running diagonally away from a part-finished cut. Overhead.',
  },

  {
    slot: 'atelier-house',
    group: 'atelier',
    purpose: 'Atelier route, opening plate.',
    ratio: '16 / 9',
    min: [2000, 1125],
    intent:
      'The converted dye house from the street at dusk. Wooden facade, one lit window, no signage. Should read as a building that has been there a long time.',
  },
  {
    slot: 'atelier-hands',
    group: 'atelier',
    purpose: 'Atelier route, closing plate.',
    ratio: '4 / 5',
    min: [1600, 2000],
    intent:
      'Hands working cloth, mid gesture, no face and no context. Available light only. The hands should look like they have done this before.',
  },
  {
    slot: 'atelier-spinning',
    group: 'atelier',
    purpose: 'Process step 01, spinning.',
    ratio: '4 / 5',
    min: [1600, 2000],
    intent:
      'Loose fibre being drawn into thread, fibres standing off the surface before the twist catches them. Macro, shallow focus.',
  },
  {
    slot: 'atelier-weaving',
    group: 'atelier',
    purpose: 'Process step 02, weaving.',
    ratio: '4 / 5',
    min: [1600, 2000],
    intent:
      'Warp threads taut across a wooden loom with the shed open, lit from the side so the individual threads separate.',
  },
  {
    slot: 'atelier-dyeing',
    group: 'atelier',
    purpose: 'Process step 03, dyeing.',
    ratio: '4 / 5',
    min: [1600, 2000],
    intent:
      'Hands lifting saturated cloth clear of a dark vat, liquid running back off the hem in one continuous stream.',
  },
  {
    slot: 'atelier-cutting',
    group: 'atelier',
    purpose: 'Process step 04, cutting.',
    ratio: '4 / 5',
    min: [1600, 2000],
    intent:
      'Shears partway through a length of cloth laid flat, chalk grain line visible running diagonally away from the cut.',
  },
  {
    slot: 'atelier-sewing',
    group: 'atelier',
    purpose: 'Process step 05, sewing.',
    ratio: '4 / 5',
    min: [1600, 2000],
    intent:
      'A hand-felled seam seen from the inside with the needle still in the fold. Thread tension visibly uneven along the run.',
  },
]

export const slotRegistry = new Map(mediaSlots.map((entry) => [entry.slot, entry]))

/** Extensions probed, in order. First one that resolves wins. */
const CANDIDATE_EXTENSIONS = ['jpg', 'webp'] as const

const resolved = new Map<string, string | null>()

export const isResolved = (slot: string): boolean | null => {
  const hit = resolved.get(slot)
  if (hit === undefined) return null
  return hit !== null
}

export const markResolved = (slot: string, path: string | null): void => {
  resolved.set(slot, path)
}

export const knownPath = (slot: string): string | null => resolved.get(slot) ?? null

export const candidatesFor = (slot: string): string[] =>
  CANDIDATE_EXTENSIONS.map((ext) => `/media/${slot}.${ext}`)

export const ratioStyle = (ratio: string): CSSProperties => ({ aspectRatio: ratio })
