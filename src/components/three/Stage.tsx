/* ==========================================================================
   Stage. The single R3F canvas host.

   Three rules this component exists to enforce, because every scene would
   otherwise have to remember them:

   1. Nothing renders when WebGL is missing or when the budget is off. The
      parent always renders a DOM equivalent, so a scene that never mounts is
      a design that never existed rather than a hole.
   2. The loop stops when the canvas is off screen or the tab is hidden. A
      site with five animated scenes and no idle cost is a different site
      from one that burns the GPU under a footer.
   3. Tone mapping is off. Every colour in the shader palette is the audited
      sRGB value from scripts/audit-palette.mjs, and ACES would quietly shift
      the ink away from the ink the CSS is using.
   ========================================================================== */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, type RootState } from '@react-three/fiber'
import { useMotionBudget } from '../../lib/capabilities'
import { EnhancementBoundary } from '../EnhancementBoundary'

export interface StageProps {
  children: ReactNode
  /** World-space camera position. Scenes are composed around z = 0. */
  camera?: { position: readonly [number, number, number]; fov?: number }
  className?: string
  /**
   * Extra margin before the loop is suspended. Tall pinned sections want a
   * generous one so the scene is warm before it scrolls into frame.
   */
  margin?: string
  onFailure?: () => void
}

export function Stage({
  children,
  camera = { position: [0, 0, 6], fov: 38 },
  className,
  margin = '160px',
  onFailure,
}: StageProps) {
  const budget = useMotionBudget()
  const hostRef = useRef<HTMLDivElement>(null)
  const invalidateRef = useRef<((frames?: number) => void) | null>(null)

  const [inView, setInView] = useState(false)
  const [tabVisible, setTabVisible] = useState(true)
  const [failed, setFailed] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const failureRef = useRef(onFailure)
  failureRef.current = onFailure
  const onContextLost = useMemo(() => (event: Event) => {
    event.preventDefault()
    setFailed(true)
    failureRef.current?.()
  }, [])

  useEffect(() => () => {
    canvasRef.current?.removeEventListener('webglcontextlost', onContextLost)
  }, [onContextLost])

  /* Idle cost. IntersectionObserver is cheaper than reading scroll and it
     survives Lenis, which does not touch the native scroll timeline the way
     a transform-based smoother would. */
  useEffect(() => {
    if (!budget.enabled) return
    const host = hostRef.current
    if (!host) return
    if (!('IntersectionObserver' in window)) {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => setInView(entries.some((entry) => entry.isIntersecting)),
      { rootMargin: margin, threshold: 0 },
    )
    observer.observe(host)

    return () => observer.disconnect()
  }, [budget.enabled, margin])

  useEffect(() => {
    if (!budget.enabled) return
    const onChange = (): void => setTabVisible(document.visibilityState === 'visible')
    onChange()
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [budget.enabled])

  const running = budget.enabled && inView && tabVisible

  /* Both of these are handed to Canvas as props it diffs by identity, so a
     fresh object on every render would re-apply the pixel ratio and the
     camera transform constantly. Memoise them once. */
  const dpr = useMemo<[number, number]>(() => [budget.dpr[0], budget.dpr[1]], [budget.dpr])

  const [cx, cy, cz] = camera.position
  const rig = useMemo(
    () => ({ position: [cx, cy, cz] as [number, number, number], fov: camera.fov ?? 38, near: 0.1, far: 60 }),
    [cx, cy, cz, camera.fov],
  )

  /* Coming back from 'never' leaves the last frame on screen until something
     asks for a draw, so ask. */
  useEffect(() => {
    if (running) invalidateRef.current?.(2)
  }, [running])

  if (!budget.enabled || failed) return null

  const classes = ['gl-stage', className ?? ''].filter(Boolean).join(' ')

  return (
    <div ref={hostRef} className={classes} aria-hidden="true" data-running={running}>
      <EnhancementBoundary onFailure={onFailure}>
      <Canvas
        flat
        frameloop={running ? 'always' : 'never'}
        dpr={dpr}
        camera={rig}
        gl={{
          antialias: true,
          alpha: true,
          stencil: false,
          depth: true,
          powerPreference: 'default',
          failIfMajorPerformanceCaveat: true,
        }}
        onCreated={(store: RootState) => {
          invalidateRef.current = store.invalidate
          store.gl.setClearColor(0x141519, 0)
          canvasRef.current = store.gl.domElement
          canvasRef.current.addEventListener('webglcontextlost', onContextLost)
        }}
      >
        {children}
      </Canvas>
      </EnhancementBoundary>
    </div>
  )
}
