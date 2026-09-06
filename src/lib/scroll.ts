/* ==========================================================================
   Scroll.

   Lenis owns wheel and touch inertia. It does not own scroll position in a
   way ScrollTrigger understands, so the two are reconciled on GSAP's own
   ticker rather than on requestAnimationFrame. That keeps pinned sections,
   scrubbed timelines, and smooth scroll sharing one clock.

   Smooth scrolling is itself a motion effect. Under prefers-reduced-motion
   Lenis is never constructed and the browser's native scroll is left alone.
   ========================================================================== */

import Lenis from 'lenis'
import type { LenisOptions } from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/** Exponential ease-out over roughly 1.15s. No bounce anywhere. */
export const LENIS_OPTIONS: Partial<LenisOptions> = {
  duration: 1.15,
  easing: (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t)),
  smoothWheel: true,
  wheelMultiplier: 0.9,
  touchMultiplier: 1.6,
  infinite: false,
}

export interface ScrollApi {
  lenis: Lenis | null
  /** True when Lenis is running. False means native scroll is in charge. */
  smoothed: boolean
  scrollTo: (target: string | number | HTMLElement, offset?: number) => void
  /** Jump to the top with no animation. Used on route change. */
  reset: () => void
  stop: () => void
  start: () => void
}

export function createScrollLayer(smoothed: boolean): ScrollApi {
  if (!smoothed) {
    return {
      lenis: null,
      smoothed: false,
      scrollTo: (target, offset = 0) => {
        if (typeof target === 'string') {
          const node = document.querySelector<HTMLElement>(target)
          if (!node) return
          const top = node.getBoundingClientRect().top + window.scrollY + offset
          window.scrollTo({ top, behavior: 'auto' })
          return
        }
        if (typeof target === 'number') {
          window.scrollTo({ top: target, behavior: 'auto' })
          return
        }
        const top = target.getBoundingClientRect().top + window.scrollY + offset
        window.scrollTo({ top, behavior: 'auto' })
      },
      reset: () => {
        window.scrollTo({ top: 0, behavior: 'auto' })
      },
      stop: () => {
        document.documentElement.style.overflow = 'hidden'
      },
      start: () => {
        document.documentElement.style.overflow = ''
      },
    }
  }

  const lenis = new Lenis(LENIS_OPTIONS)

  lenis.on('scroll', ScrollTrigger.update)

  const tick = (time: number): void => {
    lenis.raf(time * 1000)
  }
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)

  return {
    lenis,
    smoothed: true,
    scrollTo: (target, offset = 0) => {
      lenis.scrollTo(target, { offset, duration: 1.6 })
    },
    reset: () => {
      lenis.scrollTo(0, { immediate: true })
      ScrollTrigger.update()
    },
    stop: () => lenis.stop(),
    start: () => lenis.start(),
  }
}

export function destroyScrollLayer(api: ScrollApi): void {
  api.lenis?.destroy()
}

/**
 * Fraction of the document scrolled, 0 to 1. Reads the live scroll position
 * so it is correct whether or not Lenis is running.
 */
export const scrollFraction = (): number => {
  const max = document.documentElement.scrollHeight - window.innerHeight
  if (max <= 0) return 0
  return Math.min(1, Math.max(0, window.scrollY / max))
}
