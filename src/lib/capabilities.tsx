/* ==========================================================================
   Capabilities.

   One place that decides what this device is allowed to have: smooth scroll,
   WebGL, and a geometry budget. Everything downstream reads from here rather
   than probing the environment itself, so the reduced-motion contract cannot
   be accidentally bypassed by a component that forgot to check.
   ========================================================================== */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {visualPolicyFor} from './visual-policy'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createScrollLayer, destroyScrollLayer, type ScrollApi } from './scroll'
import { detectWebGL, perfTier, useReducedMotion, type PerfTier } from './motion'

interface CapabilitiesValue {
  reducedMotion: boolean
  saveData: boolean
  reducedTransparency: boolean
  webgl: boolean
  tier: PerfTier
  reduceQuality: () => void
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
  saveData: true,
  reducedTransparency: true,
  webgl: false,
  tier: 'low',
  reduceQuality: () => undefined,
  scroll: NOOP_SCROLL,
  refreshKey: 0,
  requestRefresh: () => undefined,
})

/**
 * Geometry budget handed to every WebGL scene. Scenes derive their vertex and
 * instance counts from this. Weak devices keep the complete static composition.
 */
export interface MotionBudget {
  /** Subdivisions per axis on the cloth plane. */
  clothSegments: number
  /** Warp threads in the loom field. */
  threads: number
  /** Ambient pigment motes. */
  motes: number
  /** Renderer pixel ratio ceiling. Capping this is the largest GPU saving. */
  dpr: readonly [number, number]
  enabled: boolean
}

export const BUDGET_HIGH: MotionBudget = {
  clothSegments: 96,
  threads: 90,
  motes: 200,
  dpr: [1, 1.5],
  enabled: true,
}

export const BUDGET_MEDIUM: MotionBudget = {clothSegments: 48, threads: 48, motes: 80, dpr: [1, 1.25], enabled: true}

export const BUDGET_NONE: MotionBudget = {
  clothSegments: 0,
  threads: 0,
  motes: 0,
  dpr: [1, 1],
  enabled: false,
}

export function CapabilitiesProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion()
  const [saveData,setSaveData]=useState(true)
  const [reducedTransparency,setReducedTransparency]=useState(true)
  useEffect(()=>{
    const connection=(navigator as Navigator & {connection?:EventTarget & {saveData?:boolean}}).connection
    const updateConnection=()=>setSaveData(Boolean(connection?.saveData))
    updateConnection();connection?.addEventListener('change',updateConnection)
    const query=window.matchMedia('(prefers-reduced-transparency: reduce)')
    const updateTransparency=()=>setReducedTransparency(query.matches)
    updateTransparency();query.addEventListener('change',updateTransparency)
    return()=>{connection?.removeEventListener('change',updateConnection);query.removeEventListener('change',updateTransparency)}
  },[])
  const [webgl, setWebgl] = useState(false)
  const [tier, setTier] = useState<PerfTier>('low')
  // Multiple visible scenes can report in one frame; lower only one step.
  const reduceQuality = useCallback(() => setTier(current => current !== tier ? current : current === 'high' ? 'medium' : 'low'), [tier])
  const [scroll, setScroll] = useState<ScrollApi>(NOOP_SCROLL)
  const [refreshKey, setRefreshKey] = useState(0)
  const requestRefresh = useCallback(() => setRefreshKey((key) => key + 1), [])

  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? 'still' : 'full'
    return () => { delete document.documentElement.dataset.motion }
  }, [reducedMotion])

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

  const policy=visualPolicyFor({tier,webgl,reducedMotion,saveData,reducedTransparency})
  useEffect(()=>{document.documentElement.dataset.glass=policy.glass?'rich':'solid';return()=>{delete document.documentElement.dataset.glass}},[policy.glass])

  const value = useMemo<CapabilitiesValue>(
    () => ({
      reducedMotion,
      saveData, reducedTransparency,
      webgl,
      tier,
      reduceQuality,
      scroll,
      refreshKey,
      requestRefresh,
    }),
    [saveData, reducedTransparency, reducedMotion, webgl, tier, reduceQuality, scroll, refreshKey, requestRefresh],
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
 * Geometry and permission for a scene. Low tier uses the static composition.
 */
export function useMotionBudget(): MotionBudget {
  return motionBudgetFor(useCapabilities())
}

export function motionBudgetFor({tier,webgl,reducedMotion,saveData=false}: Pick<CapabilitiesValue,'tier'|'webgl'|'reducedMotion'> & Partial<Pick<CapabilitiesValue,'saveData'>>):MotionBudget {
  if(!webgl || reducedMotion || tier==='low' || saveData)return BUDGET_NONE
  return tier === 'medium' ? BUDGET_MEDIUM : BUDGET_HIGH
}
export function useVisualPolicy(){return visualPolicyFor(useCapabilities())}
