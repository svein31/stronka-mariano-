/* ==========================================================================
   Arrival. The title sequence, shown once per session.

   Ink covers the viewport, the wordmark is drawn up from behind a mask, the
   seal stamps, and the ink rises away to reveal the first movement already
   composed underneath. It is the one moment the site addresses the visitor
   directly, so it is also the one moment that must not become an obstacle:
   it is skipped entirely under `prefers-reduced-motion`, skipped for anyone
   who has already seen it this session, and scroll is locked for exactly as
   long as it runs so the hero is never revealed half-unrolled.
   ========================================================================== */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useCapabilities } from '../lib/capabilities'
import { EASE } from '../lib/motion'
import { Seal } from './Seal'

const STORAGE_KEY = 'sumi.arrival.v1'

const DRAW = 0.9
const STAGGER = 0.075
const STAMP_AT = 0.78
const HOLD = 0.42
const CLEAR = 1.15

const LETTERS = 'SUMI'.split('')

function seen(): boolean {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    /* Private mode. Treat every visit as a first one, which is the safer
       failure because the sequence is short and can be skipped. */
    return false
  }
}

function remember(): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // Nothing to do. The next visit simply sees the sequence again.
  }
}

export function Arrival({ children }: { children: ReactNode }) {
  const { reducedMotion, scroll } = useCapabilities()
  const [skipped] = useState(() => reducedMotion || seen())
  const [gone, setGone] = useState(skipped)

  const panel = useRef<HTMLDivElement>(null)
  const chars = useRef<HTMLSpanElement[]>([])

  /* Held in a ref so the sequence does not rebuild when the real Lenis layer
     replaces the placeholder one render after mount. */
  const scrollRef = useRef(scroll)
  scrollRef.current = scroll

  /* Scroll is locked for the length of the sequence and released by the
     timeline's own completion, or immediately if the sequence never runs.
     `scroll` is a dependency because the real Lenis layer is constructed one
     render after this component mounts, and locking the placeholder instead
     would lock nothing at all. */
  useEffect(() => {
    if (skipped) return
    scroll.stop()
    return () => scroll.start()
  }, [skipped, scroll])

  useGSAP(
    () => {
      if (skipped || !panel.current) return

      const targets = chars.current.filter(Boolean)

      const timeline = gsap.timeline({
        onComplete: () => {
          remember()
          setGone(true)
          scrollRef.current.start()
        },
      })

      timeline
        .fromTo(
          targets,
          { yPercent: 122, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: DRAW,
            ease: EASE.outExpo,
            stagger: STAGGER,
          },
          0.12,
        )
        .fromTo(
          '.arrival__tag',
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.7, ease: EASE.outQuart },
          0.12 + STAGGER * LETTERS.length + 0.1,
        )
        .fromTo(
          '.arrival__seal',
          { scale: 1.4, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.34, ease: EASE.outExpo },
          STAMP_AT,
        )
        /* Ink rises off the page rather than dissolving, so the first
           movement is uncovered from the bottom edge up. */
        .to(
          panel.current,
          {
            clipPath: 'inset(0% 0% 100% 0%)',
            duration: CLEAR,
            ease: EASE.inOutQuart,
          },
          `+=${HOLD}`,
        )
    },
    { scope: panel, revertOnUpdate: true, dependencies: [skipped] },
  )

  if (gone) return <>{children}</>

  return (
    <>
      {children}

      <div className="arrival" ref={panel} aria-hidden="true">
        <div className="arrival__mark">
          <span className="arrival__word">
            {LETTERS.map((letter, index) => (
              <span className="arrival__mask" key={letter}>
                <span
                  className="arrival__char"
                  ref={(node) => {
                    if (node) chars.current[index] = node
                  }}
                >
                  {letter}
                </span>
              </span>
            ))}
          </span>
          <span className="arrival__seal">
            <Seal />
          </span>
        </div>
        <p className="arrival__tag u-label">Cloth, ink, and air</p>
      </div>
    </>
  )
}
