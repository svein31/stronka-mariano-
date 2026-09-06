/* ==========================================================================
   Cloth stage driver.

   The shared plumbing every cloth scene needs from the DOM: how far the
   visitor has unrolled past its host element, and where that element sits on
   screen right now. Both are written into refs rather than state so a scroll
   frame never triggers a React render.

   Bounds are re-measured on ScrollTrigger's own update, which is already the
   read phase of the frame, so this adds a layout read without adding a
   layout thrash.

   The progress ref is also published through context, because atmosphere
   composed into the same canvas needs to parallax against the same scroll
   value and has no other way to reach it.
   ========================================================================== */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export interface ClothStage {
  /** Scroll progress through the host, 0 as it enters to 1 as it leaves. */
  progress: RefObject<number>
  /** Host bounds in viewport pixels, or null before the first measure. */
  bounds: RefObject<DOMRect | null>
}

const IDLE: RefObject<number> = { current: 0 }

const ClothStageContext = createContext<RefObject<number>>(IDLE)

/** Publishes the owning scene's scroll progress to anything inside its canvas. */
export function ClothStageProvider({
  progress,
  children,
}: {
  progress: RefObject<number>
  children: ReactNode
}) {
  return <ClothStageContext.Provider value={progress}>{children}</ClothStageContext.Provider>
}

/** The scroll progress of the scene this element is composed into. */
export function useClothProgress(): RefObject<number> {
  return useContext(ClothStageContext)
}

export function useClothStage(
  host: RefObject<HTMLElement | null>,
  enabled: boolean,
): ClothStage {
  const progress = useRef(0)
  const bounds = useRef<DOMRect | null>(null)

  useEffect(() => {
    if (!enabled) return
    const element = host.current
    if (!element) return

    const measure = (): void => {
      bounds.current = element.getBoundingClientRect()
    }
    measure()

    /* start and end span exactly the period during which any part of the host
       is on screen, so onUpdate covers every frame the scene could draw. */
    const trigger = ScrollTrigger.create({
      trigger: element,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        progress.current = self.progress
        measure()
      },
    })

    const onResize = (): void => {
      measure()
    }

    window.addEventListener('resize', onResize)
    ScrollTrigger.addEventListener('refresh', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      ScrollTrigger.removeEventListener('refresh', onResize)
      trigger.kill()
    }
  }, [host, enabled])

  return { progress, bounds }
}

export const clamp01 = (value: number): number => (value < 0 ? 0 : value > 1 ? 1 : value)

/**
 * Frame-rate independent lag factor. Passing a delta of 1/60 and a time
 * constant of 0.14 gives the same visual speed at 30fps and at 144fps, which
 * a per-frame multiplication never does.
 */
export const lag = (delta: number, tau: number): number =>
  1 - Math.exp(-Math.min(delta, 0.1) / tau)
