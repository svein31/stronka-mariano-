/* ==========================================================================
   Route manifest.

   One list of destinations, read by the navigation, the mobile panel, and
   the footer, so the three can never drift apart. Every entry here resolves
   to a real route; the footer's category links resolve to a real filtered
   collection rather than to a page that does not exist.
   ========================================================================== */

export interface RouteEntry {
  to: string
  label: string
  kanji: string
  romaji: string
  /** Set as the numeral in the mobile panel, where routes are display type. */
  index: string
  /** Prefix matched against the pathname, for aria-current on nested routes. */
  match: string
}

export const ROUTES: RouteEntry[] = [
  {
    to: '/collection',
    label: 'Collection',
    kanji: '作品',
    romaji: 'Sakuhin',
    index: '01',
    match: '/collection',
  },
  {
    to: '/atelier',
    label: 'Atelier',
    kanji: '工房',
    romaji: 'Kōbō',
    index: '02',
    match: '/atelier',
  },
  {
    to: '/journal',
    label: 'Journal',
    kanji: '日誌',
    romaji: 'Nisshi',
    index: '03',
    match: '/journal',
  },
]

/** The collection route reads this parameter for its active filter. */
export const CATEGORY_PARAM = 'c'

export const categoryRoute = (category: string): string =>
  `${ROUTES[0].to}?${CATEGORY_PARAM}=${category}`

/** Appointment contact. The atelier is open by appointment only. */
export const APPOINTMENT_EMAIL = 'atelier@sumi-kyoto.jp'
