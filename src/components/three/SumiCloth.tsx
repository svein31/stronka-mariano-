/* ==========================================================================
   Sumi cloth. The opening image of the site.

   A single sheet of inked cloth hanging in the dark. It leans as the visitor
   unrolls past it, and it swells toward the cursor with a lag, so the surface
   always feels like it is a half beat behind the hand, which is exactly how
   heavy cloth behaves.

   The scene renders nothing at all when the budget is off. The route always
   supplies a composed DOM alternative, so reduced motion gets a still frame
   rather than a hole.
   ========================================================================== */

import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useMotionBudget } from '../../lib/capabilities'
import { Stage } from './Stage'
import { acquirePointer, pointerState, releasePointer } from './pointer'
import {
  ClothStageProvider,
  clamp01,
  lag,
  useClothStage,
} from './useClothStage'
import { createClothMaterial, type ClothParameters, type ClothUniforms } from './shaders/cloth'

/** How far the plane extends past the viewport. The excess is where the
 *  bokashi edge dissolve happens, so it has to sit outside the frame. */
const COVER = 1.4

/** Progress below which the cloth stays calm. Above it, the scroll leans the
 *  cloth back as it leaves. */
const LEAN_START = 0.34

export const HERO_CAMERA = { position: [0, 0, 7.4] as const, fov: 38 }

interface DrapeProps {
  cloth: ClothParameters
  cover: number
  progress: RefObject<number>
  bounds: RefObject<DOMRect | null>
}

function Drape({ cloth, cover, progress, bounds }: DrapeProps) {
  const budget = useMotionBudget()
  const viewport = useThree((state) => state.viewport)
  const group = useRef<THREE.Group>(null)

  const segments = Math.max(12, budget.clothSegments)

  /* A unit plane. The shader multiplies by uSize, so the cloth's world extent
     follows the viewport without a buffer ever being rebuilt. */
  const geometry = useMemo(
    () => new THREE.PlaneGeometry(1, 1, segments, Math.max(12, Math.round(segments * 0.75))),
    [segments],
  )

  /* Keyed on the individual values rather than on the cloth object. A caller
     passing an inline literal would otherwise hand back a new identity every
     render and compile a fresh shader program each time. */
  const { drape, sheen, weave, tint, opacity } = cloth
  const material = useMemo(
    () => createClothMaterial([12, 8], { drape, sheen, weave, tint, opacity }),
    [drape, sheen, weave, tint, opacity],
  )

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  /* Lagged values live in refs, not state. Nothing here should ever render. */
  const pointer = useRef(new THREE.Vector2(0, 0))
  const gust = useRef(0)
  const drift = useRef(new THREE.Vector2(0, 0))

  useFrame((state, delta) => {
    const uniforms = material.uniforms as ClothUniforms
    const live = pointerState()
    const rect = bounds.current

    /* The plane spans the viewport times cover, so the world size follows
       directly from the camera frustum R3F already computed. */
    const width = viewport.width * cover
    const height = viewport.height * cover
    uniforms.uSize.value.set(width, height)
    uniforms.uTime.value = state.clock.elapsedTime

    const raw = clamp01((progress.current - LEAN_START) / (1 - LEAN_START))
    uniforms.uScroll.value = raw

    /* Map the cursor into plane space. Bounds are only measured while the
       host is on screen, which is the only time this loop runs. */
    let targetX = 0
    let targetY = 0
    let inside = false

    if (rect && live.seen) {
      const nx = ((live.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1
      const ny = -(((live.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1)
      targetX = nx * width * 0.5
      targetY = ny * height * 0.5
      inside =
        live.clientX >= rect.left &&
        live.clientX <= rect.right &&
        live.clientY >= rect.top &&
        live.clientY <= rect.bottom
    }

    /* Two different time constants. The bulge tracks the hand closely enough
       to feel connected; the gust decays slowly so a flick leaves the cloth
       moving after the cursor has stopped. */
    const trackLag = lag(delta, 0.09)
    const gustLag = lag(delta, 0.34)

    pointer.current.x += (targetX - pointer.current.x) * trackLag
    pointer.current.y += (targetY - pointer.current.y) * trackLag
    uniforms.uPointer.value.copy(pointer.current)

    const targetGust = inside ? live.speed : 0
    gust.current += (targetGust - gust.current) * gustLag
    uniforms.uGust.value = gust.current

    /* Counter-drift. The plane moves a little against the cursor so the
       bulge reads as depth rather than as a bump on a flat sheet. */
    const driftLag = lag(delta, 0.5)
    drift.current.x += (-targetX * 0.028 - drift.current.x) * driftLag
    drift.current.y += (-targetY * 0.02 - drift.current.y) * driftLag
    if (group.current) {
      group.current.position.x = drift.current.x
      group.current.position.y = drift.current.y
    }
  })

  return (
    <group ref={group}>
      <mesh geometry={geometry} material={material} frustumCulled={false} />
    </group>
  )
}

/** Wool and cashmere at 690 grams, the Nagashi Coat's own numbers. */
const HERO_CLOTH: ClothParameters = { drape: 0.82, sheen: 0.18, weave: 0.22 }

export interface SumiClothProps {
  /** Physical parameters. Defaults to the Nagashi Coat's wool and cashmere. */
  cloth?: ClothParameters
  className?: string
  /**
   * Extra scene contents, rendered into the same canvas. Atmosphere belongs
   * here rather than in a second WebGL context.
   */
  children?: ReactNode
}

export function SumiCloth({ cloth = HERO_CLOTH, className, children }: SumiClothProps) {
  const budget = useMotionBudget()
  const hostRef = useRef<HTMLDivElement>(null)
  const { progress, bounds } = useClothStage(hostRef, budget.enabled)

  useEffect(() => {
    if (!budget.enabled) return
    acquirePointer()
    return () => releasePointer()
  }, [budget.enabled])

  if (!budget.enabled) return null

  return (
    <div ref={hostRef} className={['cloth-host', className ?? ''].filter(Boolean).join(' ')}>
      <Stage camera={HERO_CAMERA} margin="240px">
        <Drape cloth={cloth} cover={COVER} progress={progress} bounds={bounds} />
        <ClothStageProvider progress={progress}>{children}</ClothStageProvider>
      </Stage>
    </div>
  )
}
