/* ==========================================================================
   The hanko seal. One vermilion object, stamped.

   It is the only saturated moment in the system and it never appears twice
   in a single viewport. The stamp animation is the one place the whole site
   moves quickly, because a seal landing on paper is quick.
   ========================================================================== */

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useCapabilities } from '../lib/capabilities'
import { DUR, EASE } from '../lib/motion'

export interface SealProps {
  /** Single glyph inside the block. */
  glyph?: string
  /** Small inline variant used in the navigation wordmark. */
  inline?: boolean
  /** Stamp when scrolled into view. Off means the seal is simply present. */
  stampOnScroll?: boolean
  className?: string
  id?: string
}

export function Seal({
  glyph = '墨',
  inline = false,
  stampOnScroll = false,
  className,
  id,
}: SealProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const { reducedMotion } = useCapabilities()

  useGSAP(
    () => {
      if (!stampOnScroll || reducedMotion) return

      // The stamp is a single impact: scale settles from 1.35 to 1 with a
      // brief opacity flicker, exactly the way wet paste meets paper.
      gsap.fromTo(
        ref.current,
        { scale: 1.35, opacity: 0.4 },
        {
          scale: 1,
          opacity: 1,
          duration: DUR.seal + 0.14,
          ease: EASE.outExpo,
          scrollTrigger: {
            trigger: ref.current,
            start: 'top 82%',
            once: true,
          },
        },
      )
    },
    { scope: ref, dependencies: [stampOnScroll, reducedMotion] },
  )

  // Under reduced motion the seal must be fully present, not left mid-stamp.
  useEffect(() => {
    if (stampOnScroll && reducedMotion && ref.current) {
      gsap.set(ref.current, { scale: 1, opacity: 1, clearProps: 'transform' })
    }
  }, [stampOnScroll, reducedMotion])

  const classes = ['seal', inline ? 'seal--inline' : '', className ?? ''].filter(Boolean).join(' ')

  return (
    <span
      ref={ref}
      id={id}
      className={classes}
      lang="ja"
      aria-hidden="true"
      data-seal=""
    >
      {glyph}
    </span>
  )
}
