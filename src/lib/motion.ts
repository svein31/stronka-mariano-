/* ==========================================================================
   Motion core.

   The architecture rule that matters most in this project: every sequence is
   built inside a gsap.matchMedia() branch, and matchMedia's revert() puts
   inline styles back to whatever CSS said. CSS never hides content by
   default, so prefers-reduced-motion resolves to a composed static frame
   rather than a blank section. That is the contract PRODUCT.md makes.
   ========================================================================== */

import { useSyncExternalStore } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { Observer } from 'gsap/Observer'

let registered = false

/** Idempotent. Call once at module scope in main.tsx. */
export function registerMotion(): void {
  if (registered) return
  gsap.registerPlugin(ScrollTrigger, SplitText, Observer)
  registered = true
}

/* --- Timing ---------------------------------------------------------------
   Unhurried by design. Reveals sit between 0.9s and 1.4s. Nothing in this
   system bounces or elastically overshoots. */
export const DUR = {
  micro: 0.32,
  hover: 0.42,
  reveal: 0.85,
  slow: 1,
} as const

export const EASE = {
  outExpo: 'expo.out',
  outQuint: 'quint.out',
  outQuart: 'power4.out',
  inOutQuart: 'power4.inOut',
} as const

/* --- Media conditions ---------------------------------------------------- */
export const MEDIA = {
  motion: '(prefers-reduced-motion: no-preference)',
  reduced: '(prefers-reduced-motion: reduce)',
  desktop: '(min-width: 56rem)',
  tablet: '(min-width: 40rem)',
} as const

export type MotionConditions = {
  motion: boolean
  reduced: boolean
  desktop: boolean
  tablet: boolean
}

/* --- Reduced motion, reactive -------------------------------------------- */
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeReduced(onChange: () => void): () => void {
  const list = window.matchMedia(REDUCED_QUERY)
  list.addEventListener('change', onChange)
  return () => list.removeEventListener('change', onChange)
}

function readReduced(): boolean {
  return window.matchMedia(REDUCED_QUERY).matches
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, readReduced, () => false)
}

/** Imperative read, for code paths outside React. */
export const reducedMotionNow = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia(REDUCED_QUERY).matches

/* --- Capability detection ------------------------------------------------ */
export function detectWebGL(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    // The installed Three renderer requires WebGL 2.
    const context = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true })
    if (!context) return false
    const lose = context.getExtension('WEBGL_lose_context')
    lose?.loseContext()
    return true
  } catch {
    return false
  }
}

export type PerfTier = 'high' | 'low'

/**
 * Decides how much geometry and how many particles a scene is allowed to
 * build. Weak devices get a composed lighter scene, never a broken one.
 */
export function perfTier(): PerfTier {
  if (typeof navigator === 'undefined') return 'low'
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const cores = navigator.hardwareConcurrency
  const coarse =
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

  if (memory !== undefined && memory <= 4) return 'low'
  if (cores !== undefined && cores <= 4) return 'low'
  if (coarse) return 'low'
  return 'high'
}

/** Pixel ratio ceilings and geometry counts live in MotionBudget, in
 *  lib/capabilities.tsx, so scenes cannot pick their own budget. */

/* --- ScrollTrigger refresh -----------------------------------------------
   Lenis owns the scroll position and images resolve asynchronously, so
   ScrollTrigger's measurements go stale. This is the single place that
   reconciles them. */
export function refreshScrollMetrics(): void {
  ScrollTrigger.refresh()
}

/** Debounced refresh for use after layout-affecting async work. */
let refreshFrame = 0
export function scheduleRefresh(): void {
  if (refreshFrame) cancelAnimationFrame(refreshFrame)
  refreshFrame = requestAnimationFrame(() => {
    refreshFrame = 0
    ScrollTrigger.refresh()
  })
}

/* --- Shared reveal -------------------------------------------------------
   One reveal shape used across the site so pacing is consistent. Elements
   rise from below a clipped edge and settle. Transform and opacity only. */
export interface RevealOptions {
  y?: number
  stagger?: number
  duration?: number
  delay?: number
  ease?: string
}

const REVEAL_DEFAULTS: Required<RevealOptions> = {
  y: 48,
  stagger: 0.075,
  duration: DUR.reveal,
  delay: 0,
  ease: EASE.outExpo,
}

export function revealUp(
  targets: gsap.TweenTarget,
  options: RevealOptions = {},
): gsap.core.Tween {
  const config = { ...REVEAL_DEFAULTS, ...options }
  return gsap.fromTo(
    targets,
    { y: config.y, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: config.duration,
      delay: config.delay,
      ease: config.ease,
      stagger: config.stagger,
    },
  )
}

/**
 * Transform and opacity reveal for plates. The image is uncovered from the bottom edge
 * while the media itself counter-scales, so the frame appears to open rather
 * than slide.
 */
export function revealPlate(
  plate: gsap.TweenTarget,
  media: gsap.TweenTarget,
  options: { duration?: number; scale?: number } = {},
): gsap.core.Timeline {
  const duration = options.duration ?? DUR.slow
  const scale = options.scale ?? 1.18

  const timeline = gsap.timeline()
  timeline.fromTo(
    plate,
    { y: 30, opacity: 0 },
    { y: 0, opacity: 1, duration, ease: EASE.inOutQuart },
  )
  timeline.fromTo(
    media,
    { scale },
    { scale: 1, duration, ease: EASE.outExpo },
    '<',
  )
  return timeline
}
