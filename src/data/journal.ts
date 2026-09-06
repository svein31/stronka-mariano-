/* ==========================================================================
   Journal. Long-form writing on material and method. The brand proves its
   craft with evidence rather than adjectives, and this is where the evidence
   lives.
   ========================================================================== */

export type JournalField = 'Craft' | 'Material' | 'Atelier'

export interface PullQuote {
  ja: string
  en: string
}

export interface JournalEntry {
  slug: string
  index: string
  title: string
  kanji: string
  romaji: string
  field: JournalField
  /** ISO 8601, formatted at render time. */
  date: string
  readingMinutes: number
  standfirst: string
  body: string[]
  pullQuote: PullQuote
  slot: string
  alt: string
}

export const journal: JournalEntry[] = [
  {
    slug: 'bokashi',
    index: '01',
    title: 'Bokashi',
    kanji: '暈し',
    romaji: 'Gradation',
    field: 'Material',
    date: '2026-08-14',
    readingMinutes: 6,
    standfirst:
      'A single brush loaded twice, once with ink and once with water, laid to paper so the two meet without a line between them.',
    body: [
      'Bokashi is the technique of gradating one ink into another inside a single stroke. The brush is loaded at the tip with pigment and at the belly with water, then drawn once. What arrives on the paper is a field of tone with no edge you can point to and no moment where the decision was made.',
      'It is the opposite of an outline. An outline says where a thing stops. Bokashi says only that a thing thins.',
      'We borrowed it because dyeing works the same way and printing does not. A garment dipped in a vat is darker where it entered first and lighter where it left, and the transition between those two states is not a stripe or a band but a long argument that the cloth has with the dye. Nobody draws that line. It arrives.',
      'This is why we do not print gradients onto cloth. A printed gradient has a resolution, and a resolution has a step, and a step is a line you can find if you look hard enough. A dipped gradient has no step at all because no two points on the cloth spent exactly the same time in the vat.',
      'It is also why the collection has no pattern. Pattern requires repetition, and repetition requires a decision to be made twice. Bokashi is the record of a decision made once and then left alone.',
      'Applied to the way the site is built, the same principle holds. Ink is heaviest at the top of a movement and thins toward the bottom without a border anywhere to tell you it stopped. Where a surface ends and the next begins, we would rather you noticed the change of tone than the change of page.',
    ],
    pullQuote: {
      ja: '輪郭は、物がどこで止まるかを言う。暈しは、物が薄れるとだけ言う。',
      en: 'An outline says where a thing stops. Bokashi says only that a thing thins.',
    },
    slot: 'journal-bokashi',
    alt: 'Ink wash gradating from dense black at the top edge to bare paper at the bottom, no visible boundary between the two states.',
  },
  {
    slug: 'the-unlined-coat',
    index: '02',
    title: 'The Unlined Coat',
    kanji: '裏なし',
    romaji: 'Uranashi',
    field: 'Craft',
    date: '2026-07-02',
    readingMinutes: 8,
    standfirst:
      'Remove the lining and the coat becomes honest. Every seam has to be finished, because every seam can now be seen.',
    body: [
      'A lining is a pardon. It hides the inside of a garment, which means the inside can be rough, which means the construction can be fast. Most tailored coats are lined for exactly this reason, and the wearer never learns what was done behind the cloth.',
      'Take the lining out and the coat has nowhere to hide. The seam allowance has to be turned and stitched. The shoulder has to be set so the underside reads as cleanly as the top. The pocket bag has to be cut from something you would be willing to show.',
      'This roughly triples the finishing time. It also removes about two hundred grams of weight, which is most of what makes an unlined coat feel different on the body rather than merely look different on a hanger.',
      'The other consequence is movement. A lined coat is two layers that slide against each other, and the slide absorbs the motion. An unlined coat is one layer, so it moves a half beat behind the wearer and then catches up. That delay is the entire character of the Nagashi Coat. It cannot be added later.',
      'We finish the internal seams by hand with a fell stitch, which folds one allowance over the other and locks them. A machine can do this. We do not use a machine, because the tension a person applies varies slightly along the length of the seam, and that variation is what allows the coat to fall rather than hang.',
      'The edges are self-faced: the coat cloth folded back on itself, no binding tape, no contrast facing. From three metres it reads as a clean edge. From thirty centimetres you can see where it was turned and how carefully.',
      'There is a cost. An unlined coat cannot be altered much, because there is no seam allowance hidden behind a lining to let out. Buy the size that fits the shoulder and accept the rest.',
    ],
    pullQuote: {
      ja: '裏地は赦しである。',
      en: 'A lining is a pardon. It hides the inside of a garment, which means the inside can be rough.',
    },
    slot: 'journal-unlined-coat',
    alt: 'Inside of an unlined wool coat turned to the light, showing hand-felled seam allowances and a self-faced edge with no binding tape.',
  },
  {
    slug: 'twelve-dips',
    index: '03',
    title: 'Twelve Dips',
    kanji: '十二回',
    romaji: 'Jūnikai',
    field: 'Material',
    date: '2026-05-19',
    readingMinutes: 7,
    standfirst:
      'Indigo is not a colour you add. It is a colony you keep alive, and the cloth only turns blue once it has been taken out.',
    body: [
      'A natural indigo vat is fermented. Indigo leaves are composted into sukumo, then mixed with wood ash lye, wheat bran, and lime, and held at around twenty-five degrees. What grows in that vat is a bacterial colony, and the colony is what does the work.',
      'The vat is yellow-green, not blue. Indigo is insoluble in water, so the colony reduces it into a soluble form that cloth can actually absorb. The cloth comes out of the vat that same yellow-green and looks like nothing has happened.',
      'Then it meets air. Oxidation takes about twenty minutes and the colour arrives from the outside in, which is the single most striking thing to watch in a dye house. You cannot rush it and you cannot do it twice in the same moment.',
      'One dip produces a pale sky. To reach the depth we want, the cloth goes in and comes out twelve times over nine days, with oxidation and rinsing between each. The vat has to be fed and stirred daily through that period, and it has to be kept at temperature or the colony dies.',
      'Twelve is not a marketing number. It is where the colour stops accepting more. Beyond it the indigo sits on the surface of the fibre rather than in it, and surface indigo rubs off on everything you own.',
      'The result is a blue that continues to change for years. It will fade at the collar and the cuffs first, in exactly the places your body touches it, and the faded colour is a warmer blue than the original because the deepest layer of pigment is the one that stays.',
      'We cannot promise consistency between batches. A living vat is not a recipe. Two jackets from the same season will differ slightly, and if you need them to match you should buy them together.',
    ],
    pullQuote: {
      ja: '藍は生きている。甕は温度で殺せる。',
      en: 'The vat is alive. It can be killed by temperature, and it can be killed by neglect.',
    },
    slot: 'journal-twelve-dips',
    alt: 'Cloth lifted from a fermentation indigo vat, still yellow-green before oxidation, dye running back into the surface of the liquid.',
  },
  {
    slug: 'cutting-against-the-grain',
    index: '04',
    title: 'Cutting Against the Grain',
    kanji: '逆目',
    romaji: 'Sakasame',
    field: 'Atelier',
    date: '2026-03-08',
    readingMinutes: 5,
    standfirst:
      'Woven cloth has a direction. Almost everything is cut to respect it, and a small number of things are cut to fight it.',
    body: [
      'A woven cloth has warp running the length and weft running the width, and between them a bias at forty-five degrees where the cloth stops being stable and starts being elastic.',
      'Cut on the straight grain and cloth behaves. It holds a line, it resists stretch, it hangs where you put it. This is what almost all tailoring does and it is the correct default.',
      'Cut on the bias and the same cloth becomes a different material. It stretches under its own weight, it clings at the points where it is held and falls away everywhere else, and it will grow several centimetres over the first few wearings.',
      'We cut the Habotai Shirt on the bias precisely because silk that light has no structure of its own. On the straight grain it would collapse into a bag. On the bias it stretches just enough to find the body and then stop.',
      'The cost is that a bias-cut garment cannot be hemmed straight, because the hem is stretching at a different rate along its length. It has to be hung for two days after sewing and then levelled, cutting away whatever the cloth decided to become.',
      'This is wasteful and slow and it is the only way to make the garment behave. The two days of hanging are not drying time. They are the cloth finishing the cut that the scissors started.',
      'Every pattern in the collection is marked with its grain line, and the marker is left visible on the inside of the finished piece. If you want to know how a garment was cut, look for it.',
    ],
    pullQuote: {
      ja: '布には方向がある。',
      en: 'Woven cloth has a direction. Almost everything is cut to respect it.',
    },
    slot: 'journal-cutting',
    alt: 'Silk cut on the bias and pinned to a cutting table, the cloth pulling diagonally away from the marked grain line.',
  },
]

export const entryBySlug = (slug: string): JournalEntry | undefined =>
  journal.find((entry) => entry.slug === slug)

export const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(iso),
  )
