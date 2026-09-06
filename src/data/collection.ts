/* ==========================================================================
   Collection 01: Utsuroi (移ろい)
   The imperceptible shifting of season and colour.

   Every garment carries a `cloth` block of physical parameters. Those are
   not decoration: they drive the WebGL material orb on the product route,
   so the 3D surface drape, sheen, and thread visibility are derived from
   the real fabric rather than hand-tuned per screen.
   ========================================================================== */

export type Category = 'outerwear' | 'knitwear' | 'shirts' | 'trousers' | 'cloth'

export const CATEGORY_LABELS: Record<Category, string> = {
  outerwear: 'Outerwear',
  knitwear: 'Knitwear',
  shirts: 'Shirts',
  trousers: 'Trousers',
  cloth: 'Cloth',
}

/** Traditional Japanese colour names. None of these are pure black or white. */
export interface Colourway {
  name: string
  kanji: string
  romaji: string
  hex: string
}

export interface Cloth {
  /** 0 is a board, 1 is water. */
  drape: number
  /** 0 is matte cotton, 1 is habotai silk catching a window. */
  sheen: number
  /** How visible the individual thread is at the surface. */
  weave: number
  /** Grams per square metre, as a label. */
  weight: string
}

export interface Garment {
  slug: string
  index: string
  name: string
  kanji: string
  romaji: string
  category: Category
  price: number
  composition: string
  origin: string
  care: string
  sizes: string[]
  colourways: Colourway[]
  cloth: Cloth
  summary: string
  detail: string[]
  /** Filename stem in public/media. See public/media/MANIFEST.md. */
  slot: string
  alt: string
}

const SUMI: Colourway = { name: 'Sumi', kanji: '墨', romaji: 'Ink black', hex: '#1b1d22' }
const WASHI: Colourway = { name: 'Washi', kanji: '紙', romaji: 'Unbleached paper', hex: '#f0ece2' }
const AI: Colourway = { name: 'Ai', kanji: '藍', romaji: 'Vat indigo', hex: '#22304a' }
const HAINEZUMI: Colourway = { name: 'Hai', kanji: '灰', romaji: 'Wood ash grey', hex: '#7d7d78' }
const KUCHIBA: Colourway = { name: 'Kuchiba', kanji: '枯葉', romaji: 'Withered leaf', hex: '#8a6a45' }
const SHIRONERI: Colourway = { name: 'Shironeri', kanji: '白練', romaji: 'Undyed silk', hex: '#e3dccc' }
const KUROCHA: Colourway = { name: 'Kurocha', kanji: '黒茶', romaji: 'Black tea brown', hex: '#2e2622' }
const BYAKUGUN: Colourway = { name: 'Byakugun', kanji: '白群', romaji: 'Pale mineral blue', hex: '#9fb2bd' }

export const COLLECTION_NAME = 'Utsuroi'
export const COLLECTION_KANJI = '移ろい'
export const COLLECTION_NUMBER = '01'
export const COLLECTION_SEASON = 'Autumn and Winter'

export const garments: Garment[] = [
  {
    slug: 'nagashi-coat',
    index: '01',
    name: 'Nagashi Coat',
    kanji: '流れ',
    romaji: 'Nagashi',
    category: 'outerwear',
    price: 184000,
    composition: '72% wool, 28% cashmere. Unlined. Self-faced edges.',
    origin: 'Cloth woven in Aichi. Cut and sewn in Kyoto.',
    care: 'Dry clean only. Rest two days between wearings. Steam, do not press.',
    sizes: ['1', '2', '3'],
    colourways: [SUMI, HAINEZUMI, KUROCHA],
    cloth: { drape: 0.82, sheen: 0.18, weave: 0.22, weight: '690 g/m²' },
    summary:
      'An unlined overcoat cut in one length from shoulder to hem, with no break at the waist.',
    detail: [
      'The coat is cut without a lining, which means every internal seam is finished by hand and visible from the inside. There is no layer between the wearer and the cloth, so the garment moves a half beat behind the body rather than with it.',
      'The shoulder is dropped four centimetres and the sleeve is set in straight, without a head. This is what produces the fall: weight is carried at the back of the neck and released all at once down the front.',
      'Wool is spun at 690 grams per square metre, heavy enough to hold a vertical line in wind. The cashmere is there for the hand at the collar, where cloth meets skin.',
      'Length is graded to fall below the knee at size 2. It is intended to be worn over everything else you own.',
    ],
    slot: 'garment-nagashi-coat',
    alt: 'Unlined wool and cashmere overcoat in ink black, hanging open, shoulder dropped, hem falling below the knee against a dark ground.',
  },
  {
    slug: 'sashiko-jacket',
    index: '02',
    name: 'Sashiko Work Jacket',
    kanji: '刺子',
    romaji: 'Sashiko',
    category: 'outerwear',
    price: 112000,
    composition: '100% cotton. Twelve-dip ai indigo. Hand-stitched sashiko across the yoke.',
    origin: 'Dyed in Tokushima. Stitched in Okayama.',
    care: 'Wash cold, alone, inside out. Expect indigo to transfer for the first six washes. Dry in shade.',
    sizes: ['1', '2', '3', '4'],
    colourways: [AI, SUMI],
    cloth: { drape: 0.34, sheen: 0.08, weave: 0.78, weight: '420 g/m²' },
    summary:
      'A work jacket dipped twelve times in a living indigo vat, then stitched by hand across the yoke.',
    detail: [
      'The vat is kept alive by fermentation. Cloth enters it pale green and turns blue only as it comes out and meets air. Twelve dips over nine days produces a depth that a single chemical dye cannot reach, and the colour continues to move for years afterwards.',
      'Sashiko is a running stitch worked in rows across the yoke and cuffs. It began as repair and became structure: the stitching holds two layers together and stiffens exactly where a work jacket needs to be stiff.',
      'Each row is stitched by hand at roughly four stitches per centimetre. The slight irregularity of spacing is the evidence.',
      'It will fade at the elbows and the collar first. That is the intended life of the garment, not a defect in it.',
    ],
    slot: 'garment-sashiko-jacket',
    alt: 'Indigo cotton work jacket with visible white running stitch across the yoke, front open, photographed flat against a dark ground.',
  },
  {
    slug: 'enso-knit',
    index: '03',
    name: 'Enso Knit',
    kanji: '円相',
    romaji: 'Ensō',
    category: 'knitwear',
    price: 94000,
    composition: '58% kid mohair, 32% silk, 10% wool. Whole-garment, no seams.',
    origin: 'Knitted in one piece in Yamagata.',
    care: 'Hand wash cold. Dry flat. Brush with a soft nap brush to raise the halo.',
    sizes: ['1', '2', '3'],
    colourways: [SHIRONERI, HAINEZUMI, SUMI],
    cloth: { drape: 0.68, sheen: 0.42, weave: 0.55, weight: '310 g/m²' },
    summary:
      'Knitted in a single closed circle on a whole-garment machine, so the body has no seams at all.',
    detail: [
      'An ensō is a circle drawn in one unloaded brushstroke. The knit is built the same way: the machine starts at the hem and finishes at the neck without a single join, so there is no side seam to pull the cloth out of true.',
      'Kid mohair carries a halo, the loose fibres that stand off the surface and catch light from behind. Blending it with silk keeps that halo from collapsing into fluff and gives the surface a low wet shine where it is stretched.',
      'At 310 grams the knit is lighter than it looks. It is designed to be worn under the Nagashi Coat rather than instead of it.',
      'Because there are no seams there is also no structure to hold a shape, so the garment takes the shape of whoever is inside it.',
    ],
    slot: 'garment-enso-knit',
    alt: 'Seamless mohair and silk knit in undyed cream, halo fibres catching light at the shoulder, sleeves falling long past the wrist.',
  },
  {
    slug: 'habotai-shirt',
    index: '04',
    name: 'Habotai Shirt',
    kanji: '羽二重',
    romaji: 'Habotai',
    category: 'shirts',
    price: 85000,
    composition: '100% silk habotai, 16 momme. French seams throughout.',
    origin: 'Woven in Fukui. Sewn in Kyoto.',
    care: 'Hand wash cold with a neutral soap. Do not wring. Press on the reverse at low heat.',
    sizes: ['1', '2', '3', '4'],
    colourways: [SHIRONERI, BYAKUGUN, SUMI],
    cloth: { drape: 0.94, sheen: 0.76, weave: 0.14, weight: '62 g/m²' },
    summary:
      'Sixteen-momme silk habotai, the lightest cloth in the collection, cut deliberately oversize.',
    detail: [
      'Habotai means soft and doubled. It is a plain weave so fine that at sixteen momme it reads as a surface rather than as a structure, and light passes partway through it.',
      'The shirt is cut three sizes larger than it needs to be, then weighted at the cuff. Loose silk collapses; silk held at two points falls.',
      'Every seam is a French seam, folded twice and stitched inside itself, because the cloth is translucent enough that a raw edge would show.',
      'It is the only garment in the collection that makes a sound when it moves.',
    ],
    slot: 'garment-habotai-shirt',
    alt: 'Pale silk habotai shirt, translucent and oversize, sleeves weighted at the cuff, catching window light against a dark ground.',
  },
  {
    slug: 'utsuroi-trouser',
    index: '05',
    name: 'Utsuroi Wide Trouser',
    kanji: '移ろい',
    romaji: 'Utsuroi',
    category: 'trousers',
    price: 68000,
    composition: '62% cupro, 38% wool. Single forward pleat, unhemmed.',
    origin: 'Cloth woven in Ishikawa. Cut and sewn in Kyoto.',
    care: 'Dry clean. Press the pleat from the inside only.',
    sizes: ['1', '2', '3', '4'],
    colourways: [SUMI, HAINEZUMI, KUROCHA],
    cloth: { drape: 0.88, sheen: 0.3, weave: 0.26, weight: '340 g/m²' },
    summary:
      'A wide trouser in cupro and wool, delivered unhemmed so the length is finished by whoever wears it.',
    detail: [
      'Cupro is the regenerated cellulose left over from cotton linters. It has the weight and the cool hand of silk and none of the fragility, which is why it is blended here rather than used alone.',
      'One forward pleat opens at the hip and falls closed. The leg is cut wide from thigh to ankle with no taper at all, so the trouser describes the movement of walking rather than the shape of the leg.',
      'It ships unhemmed. The cloth is finished with a selvedge rather than an overlock, so a tailor can turn it up once and leave the edge visible.',
      'Named for the collection because the colour shifts slightly under different light, which cupro does and wool does not.',
    ],
    slot: 'garment-utsuroi-trouser',
    alt: 'Wide ink black cupro and wool trouser with a single forward pleat, photographed from the hip down, hem falling unturned onto the floor.',
  },
  {
    slug: 'ku-tunic',
    index: '06',
    name: 'Kū Tunic',
    kanji: '空',
    romaji: 'Kū',
    category: 'shirts',
    price: 76000,
    composition: '100% European flax, hand-loomed. Unfinished collar edge.',
    origin: 'Loomed in Niigata. Sewn in Kyoto.',
    care: 'Machine wash cold. Line dry. Iron damp, or do not iron at all.',
    sizes: ['1', '2', '3'],
    colourways: [WASHI, SHIRONERI, SUMI],
    cloth: { drape: 0.46, sheen: 0.12, weave: 0.86, weight: '240 g/m²' },
    summary:
      'A hand-loomed flax tunic with an unfinished collar, cut to be worn against skin in heat.',
    detail: [
      'The flax is hand-loomed rather than machine woven, which leaves a slub in the thread. The irregularity is not a flaw to be sorted out; it is the reason the cloth breathes where a uniform weave would not.',
      'The collar edge is left raw and folded once. Flax does not fray the way cotton does, and the exposed edge softens with every wash until it becomes the most comfortable part of the garment.',
      'Kū means emptiness in the Buddhist sense: the space that makes a vessel useful. The tunic is cut with that much room through the body.',
      'It is the one garment here meant to be worn hard, in summer, every day.',
    ],
    slot: 'garment-ku-tunic',
    alt: 'Unbleached hand-loomed flax tunic with a raw folded collar, hanging loose, visible slub in the weave catching raking light.',
  },
  {
    slug: 'kake-wrap',
    index: '07',
    name: 'Kake Wrap',
    kanji: '掛け',
    romaji: 'Kake',
    category: 'cloth',
    price: 52000,
    composition: '84% wool gauze, 16% silk. Hand-knotted fringe.',
    origin: 'Woven in Wakayama. Fringed by hand in Kyoto.',
    care: 'Dry clean. Store folded, never hung.',
    sizes: ['One size'],
    colourways: [HAINEZUMI, KUCHIBA, SUMI],
    cloth: { drape: 0.76, sheen: 0.24, weave: 0.62, weight: '280 g/m²' },
    summary:
      'A double-width wool gauze wrap, knotted at the fringe, sized to be worn four different ways.',
    detail: [
      'Wool gauze is woven as two cloths held together at intervals, which traps air between them. At 280 grams it is warmer than a solid wool of twice the weight.',
      'The fringe is knotted by hand in groups of three so it does not tangle. Each wrap carries roughly nine hundred knots.',
      'It is cut at two metres by seventy centimetres, which is wide enough to wear over the shoulders, around the hips, or folded as a scarf without any of those uses looking improvised.',
      'The one object in the collection that is not a garment until someone decides how to wear it.',
    ],
    slot: 'garment-kake-wrap',
    alt: 'Folded wool gauze wrap in ash grey with a hand-knotted fringe, draped over a low wooden bench, folds catching soft light.',
  },
  {
    slug: 'tabi-sock',
    index: '08',
    name: 'Tabi Sock',
    kanji: '足袋',
    romaji: 'Tabi',
    category: 'cloth',
    price: 18000,
    composition: '92% cotton, 7% nylon, 1% elastane. Split toe, reinforced heel.',
    origin: 'Knitted in Nara.',
    care: 'Machine wash warm. Tumble dry low.',
    sizes: ['S', 'M', 'L'],
    colourways: [SUMI, WASHI, AI],
    cloth: { drape: 0.2, sheen: 0.05, weave: 0.7, weight: '190 g/m²' },
    summary: 'A split-toe sock knitted in Nara, reinforced at the heel, sold in pairs.',
    detail: [
      'The split toe is knitted as two tubes joined at the instep rather than cut and seamed, so there is no seam pressing between the toes.',
      'Nara has knitted socks since the sixteenth century. The machines are old and slow and produce a denser tube than anything currently running at speed.',
      'The heel is reinforced with a second yarn carried inside the first, which is where a sock fails and therefore where it should be strongest.',
      'Sold in pairs, undyed at the toe so the division is visible.',
    ],
    slot: 'garment-tabi-sock',
    alt: 'Pair of ink black split-toe knitted socks, laid flat and slightly overlapping, reinforced heel visible.',
  },
]

export const garmentBySlug = (slug: string): Garment | undefined =>
  garments.find((garment) => garment.slug === slug)

export const garmentsByCategory = (category: Category): Garment[] =>
  garments.filter((garment) => garment.category === category)

export const categoriesInUse: Category[] = (() => {
  const present = new Set(garments.map((garment) => garment.category))
  return (Object.keys(CATEGORY_LABELS) as Category[]).filter((category) => present.has(category))
})()

export const formatPrice = (value: number): string =>
  new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value)
