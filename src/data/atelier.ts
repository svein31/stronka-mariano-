/* ==========================================================================
   Atelier. The house, the process, and the materials index.
   Written as prose and spec rows, never as a metric grid: big number plus
   small label plus supporting stats is banned by DESIGN.md.
   ========================================================================== */

export interface ProcessStep {
  index: string
  ja: string
  romaji: string
  title: string
  body: string
  slot: string
  alt: string
}

export const process: ProcessStep[] = [
  {
    index: '01',
    ja: '紡ぐ',
    romaji: 'Tsumugu',
    title: 'Spinning',
    body: 'Fibre is drawn out and twisted into thread. The amount of twist decides almost everything downstream: a low twist makes a soft thread that pills, a high twist makes a hard thread that drapes badly. We spin low and accept the pilling, because the hand of the cloth matters more than its durability in a first season.',
    slot: 'atelier-spinning',
    alt: 'Loose wool fibre being drawn into thread on a slow spinning frame, fibres standing off the surface before the twist catches them.',
  },
  {
    index: '02',
    ja: '織る',
    romaji: 'Oru',
    title: 'Weaving',
    body: 'Warp is tensioned lengthwise and weft is passed across it. A hand loom runs at roughly a tenth of the speed of a power loom and leaves a slub in the cloth that no machine will reproduce, because the weaver changes tension without deciding to. Flax and wool gauze are woven by hand. Everything else is woven slowly on machines that are older than the people running them.',
    slot: 'atelier-weaving',
    alt: 'Warp threads stretched taut across a wooden loom, weft partway through a pass, the shed open and lit from the side.',
  },
  {
    index: '03',
    ja: '染める',
    romaji: 'Someru',
    title: 'Dyeing',
    body: 'Indigo is fermented, not mixed. The vat is a colony and it is kept at temperature and fed daily for as long as it is in use. Cloth goes in yellow-green and comes out blue only when it meets air, which takes twenty minutes per dip. Twelve dips over nine days is the depth we want, and it is also the depth at which the fibre stops accepting more.',
    slot: 'atelier-dyeing',
    alt: 'Hands lifting indigo-saturated cloth clear of a dark fermentation vat, liquid running back off the hem in a continuous stream.',
  },
  {
    index: '04',
    ja: '断つ',
    romaji: 'Tatsu',
    title: 'Cutting',
    body: 'Cloth has a direction. Cut on the straight grain and it holds a line; cut on the bias at forty-five degrees and the same cloth becomes elastic. Most of the collection is cut straight. The Habotai Shirt is cut on the bias, hung for two days after sewing, and then levelled, because the hem stretches at a different rate along its length.',
    slot: 'atelier-cutting',
    alt: 'Shears partway through a length of silk laid flat on a cutting table, a chalk grain line visible running diagonally away from the cut.',
  },
  {
    index: '05',
    ja: '縫う',
    romaji: 'Nuu',
    title: 'Sewing',
    body: 'Seams that will be seen are finished by hand with a fell stitch, which folds one allowance over the other and locks them. A machine can produce the stitch. We use a person, because the tension applied varies slightly along the length of the seam, and that variation is what lets an unlined coat fall rather than hang.',
    slot: 'atelier-sewing',
    alt: 'Hand-felled seam on an unlined coat seen from the inside, needle still in the fold, thread tension visibly uneven along the run.',
  },
]

export interface Material {
  name: string
  ja: string
  romaji: string
  origin: string
  property: string
  /** Physical parameters shared with the WebGL material orb. */
  drape: number
  sheen: number
  weave: number
}

export const materials: Material[] = [
  {
    name: 'Wool',
    ja: '羊毛',
    romaji: 'Yōmō',
    origin: 'Victoria, Australia. Spun in Aichi.',
    property: 'Holds a vertical line in wind. Recovers from creasing overnight. Heavy at 690 grams.',
    drape: 0.7,
    sheen: 0.14,
    weave: 0.3,
  },
  {
    name: 'Cashmere',
    ja: 'カシミヤ',
    romaji: 'Kashimira',
    origin: 'Alashan, Inner Mongolia.',
    property: 'Carried only at the collar, where cloth meets skin. Eight times warmer than wool by weight.',
    drape: 0.78,
    sheen: 0.2,
    weave: 0.18,
  },
  {
    name: 'Flax',
    ja: '亜麻',
    romaji: 'Ama',
    origin: 'Normandy, France. Hand-loomed in Niigata.',
    property: 'Conducts heat away from the body. Slubs in the thread are the reason it breathes.',
    drape: 0.44,
    sheen: 0.1,
    weave: 0.86,
  },
  {
    name: 'Silk habotai',
    ja: '羽二重',
    romaji: 'Habotai',
    origin: 'Woven in Fukui at sixteen momme.',
    property: 'Translucent plain weave. Light passes partway through. Makes a sound when it moves.',
    drape: 0.95,
    sheen: 0.78,
    weave: 0.12,
  },
  {
    name: 'Cupro',
    ja: '銅氨',
    romaji: 'Dōan',
    origin: 'Regenerated from cotton linters, Ishikawa.',
    property: 'The weight and cool hand of silk with none of the fragility. Shifts colour slightly under different light.',
    drape: 0.88,
    sheen: 0.32,
    weave: 0.24,
  },
  {
    name: 'Cotton',
    ja: '木綿',
    romaji: 'Momen',
    origin: 'Woven in Okayama at 420 grams.',
    property: 'Dense enough to take twelve dips of indigo without losing its body. Fades where the wearer touches it.',
    drape: 0.34,
    sheen: 0.07,
    weave: 0.78,
  },
  {
    name: 'Kid mohair',
    ja: 'キッドモヘヤ',
    romaji: 'Kiddo moheya',
    origin: 'Knitted in Yamagata.',
    property: 'Carries a halo of loose fibre that catches light from behind. Blended with silk so the halo does not collapse.',
    drape: 0.66,
    sheen: 0.44,
    weave: 0.56,
  },
  {
    name: 'Wool gauze',
    ja: 'ウールガーゼ',
    romaji: 'Ūru gāze',
    origin: 'Woven in Wakayama as a double cloth.',
    property: 'Two cloths held together at intervals, trapping air between them. Warmer than a solid wool at twice the weight.',
    drape: 0.74,
    sheen: 0.22,
    weave: 0.64,
  },
]

export const house = {
  founded: '2019',
  city: 'Kyoto',
  district: 'Nakagyō',
  statement:
    'SUMI is an atelier of nine people working out of a converted dye house in Nakagyō. We make two collections a year and we do not add to them between seasons.',
  principles: [
    {
      title: 'No lining unless it is asked for',
      body: 'Every seam is finished so it can be seen. If a construction cannot survive being turned inside out, it is not finished.',
    },
    {
      title: 'No printed pattern',
      body: 'Colour arrives from a vat or not at all. A print has a step you can find; a dye has a gradient you cannot.',
    },
    {
      title: 'No season between seasons',
      body: 'The collection closes when it closes. We would rather a garment be unavailable for four months than produce it badly to fill a gap.',
    },
    {
      title: 'Nothing sold that cannot be repaired',
      body: 'Every piece can come back to the atelier. We keep the cloth and the thread for seven years after a collection closes.',
    },
  ],
  visit: {
    line1: 'The atelier is open by appointment on the first Thursday of each month.',
    line2: 'Nakagyō Ward, Kyoto. Address is sent on confirmation.',
  },
}
