/* ==========================================================================
   Capabilities.

   One place that decides what this device is allowed to have: smooth scroll,
   WebGL, and a geometry budget. Everything downstream reads from here rather
   than probing the environment itself, so the reduced-motion contract cannot
   be accidentally bypassed by a component that forgot to check.
   ========================================================================== */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createScrollLayer, destroyScrollLayer, type ScrollApi } from './scroll'
import { detectWebGL, perfTier, useReducedMotion, type PerfTier } from './motion'

interface CapabilitiesValue {
  reducedMotion: boolean
  webgl: boolean
  tier: PerfTier
  scroll: ScrollApi
  /** Bumped whenever fonts or imagery settle, so ScrollTrigger re-measures. */
  refreshKey: number
  requestRefresh: () => void
}

const NOOP_SCROLL: ScrollApi = {
  lenis: null,
  smoothed: false,
  scrollTo: () => undefined,
  reset: () => undefined,
  stop: () => undefined,
  start: () => undefined,
}

const CapabilitiesContext = createContext<CapabilitiesValue>({
  reducedMotion: false,
  webgl: false,
  tier: 'low',
  scroll: NOOP_SCROLL,
  refreshKey: 0,
  requestRefresh: () => undefined,
})

/**
 * Geometry budget handed to every WebGL scene. Scenes derive their vertex and
 * instance counts from this so a weak device receives a lighter composition
 * rather than a broken or absent one.
 */
export interface MotionBudget {
  /** Subdivisions per axis on the cloth plane. */
  clothSegments: number
  /** Warp threads in the loom field. */
  threads: number
  /** Ambient ink motes. */
  motes: number
  /** Renderer pixel ratio ceiling. Capping this is the largest GPU saving. */
  dpr: readonly [number, number]
  enabled: boolean
}

export const BUDGET_HIGH: MotionBudget = {
  clothSegments: 128,
  threads: 140,
  motes: 900,
  dpr: [1, 2],
  enabled: true,
}

export const BUDGET_LOW: MotionBudget = {
  clothSegments: 64,
  threads: 60,
  motes: 260,
  dpr: [1, 1.5],
  enabled: true,
}

export const BUDGET_NONE: MotionBudget = {
  clothSegments: 0,
  threads: 0,
  motes: 0,
  dpr: [1, 1],
  enabled: false,
}

export function CapabilitiesProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion()
  const [webgl, setWebgl] = useState(false)
  const [tier, setTier] = useState<PerfTier>('low')
  const [scroll, setScroll] = useState<ScrollApi>(NOOP_SCROLL)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setWebgl(detectWebGL())
    setTier(perfTier())
  }, [])

  useEffect(() => {
    // Smooth scrolling is a motion effect. Under reduced motion it is never
    // constructed, and native scroll is left completely alone.
    const layer = createScrollLayer(!reducedMotion)
    setScroll(layer)

    return () => {
      destroyScrollLayer(layer)
    }
  }, [reducedMotion])

  useEffect(() => {
    // Images resolve asynchronously and Lenis changes scroll metrics, so
    // ScrollTrigger's cached start and end positions go stale.
    const onLoad = () => ScrollTrigger.refresh()
    window.addEventListener('load', onLoad)
    return () => window.removeEventListener('load', onLoad)
  }, [])

  useEffect(() => {
    ScrollTrigger.refresh()
  }, [refreshKey, reducedMotion])

  const value = useMemo<CapabilitiesValue>(
    () => ({
      reducedMotion,
      webgl,
      tier,
      scroll,
      refreshKey,
      requestRefresh: () => setRefreshKey((key) => key + 1),
    }),
    [reducedMotion, webgl, tier, scroll, refreshKey],
  )

  return <CapabilitiesContext.Provider value={value}>{children}</CapabilitiesContext.Provider>
}

export function useCapabilities(): CapabilitiesValue {
  return useContext(CapabilitiesContext)
}

/**
 * Whether choreographed motion may run at all. Reduced motion is an absolute
 * veto: no device capability overrides a visitor's stated preference.
 */
export function useMotionAllowed(): boolean {
  return !useCapabilities().reducedMotion
}

/**
 * How much geometry a scene may build. This is a budget, not a permission.
 * A low tier gets a lighter composed scene, never a broken or absent one.
 */
export function useMotionBudget(): MotionBudget {
  const { tier, webgl } = useCapabilities()
  return tier === 'high' ? BUDGET_HIGH : webgl ? BUDGET_LOW : BUDGET_NONE
}
