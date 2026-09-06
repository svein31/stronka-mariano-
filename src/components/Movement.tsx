/* ==========================================================================
   Movement. One band of the picture scroll.

   The movement is the site's structural unit and the thing that carries its
   rhythm: ink movement, washi relief, ink again. `ground="paper"` adds the
   class that flips every semantic token at once, so nothing inside a movement
   ever needs to know which world it is standing in.

   Children are rendered directly into the section rather than into a padded
   wrapper, because half the movements here are full-bleed and a wrapper they
   had to escape would be a wrapper they would eventually fight.
   ========================================================================== */

import type { CSSProperties, ReactNode } from 'react'

export type Ground = 'ink' | 'void' | 'lift' | 'paper'

const GROUND_CLASS: Record<Ground, string> = {
  ink: '',
  void: 'movement--void',
  lift: 'movement--lift',
  paper: 'movement--paper',
}

export interface MovementProps {
  children: ReactNode
  ground?: Ground
  className?: string
  id?: string
  /**
   * Tategaki label running down one edge for the length of the movement. It
   * is the scroll's own furniture, never content, so it is hidden from
   * assistive tech and disappears below 56rem where there is no margin for it.
   */
  spine?: string
  spineSide?: 'left' | 'right'
  labelledBy?: string
  style?: CSSProperties
}

export function Movement({
  children,
  ground = 'ink',
  className,
  id,
  spine,
  spineSide = 'left',
  labelledBy,
  style,
}: MovementProps) {
  const classes = ['movement', GROUND_CLASS[ground], className ?? ''].filter(Boolean).join(' ')

  return (
    <section className={classes} id={id} aria-labelledby={labelledBy} style={style}>
      {spine ? (
        <span className={`spine spine--${spineSide}`} aria-hidden="true">
          {spine}
        </span>
      ) : null}
      {children}
    </section>
  )
}

/* --- Movement head --------------------------------------------------------
   The furniture that opens a movement: an index numeral in aged gold, the
   title, and an optional trailing note. Set against the largest available
   display size, per the Two-Extremes Rule. */

export interface MovementHeadProps {
  /** Index numeral, e.g. "02". */
  index?: string
  title: ReactNode
  /** Reading of the title, in romaji. */
  reading?: string
  /** Trailing note set opposite the title on the baseline. */
  note?: ReactNode
  id?: string
  className?: string
}

export function MovementHead({ index, title, reading, note, id, className }: MovementHeadProps) {
  return (
    <header className={['movement__head', 'shell', className ?? ''].filter(Boolean).join(' ')}>
      <div className="movement__title">
        {index ? (
          <span className="movement__index u-metal u-label">{index}</span>
        ) : null}
        <h2 className="u-headline" id={id}>
          {title}
        </h2>
        {reading ? (
          <span className="movement__reading u-label">{reading}</span>
        ) : null}
      </div>
      {note ? <div className="movement__note">{note}</div> : null}
    </header>
  )
}
