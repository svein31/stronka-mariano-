/* ==========================================================================
   Warp field. The loom.

   A set of taut threads stretched across the frame, tilted away so they
   converge in perspective. The cursor unprojects onto the plane of the warp
   and parts them, opening the shed, and light comes in through the gap.
   Scrolling combs a wave down the whole set at once.

   The thread count and the pitch are derived from the budget and the live
   viewport, so the warp reads at the same density on a phone and on an
   ultrawide instead of thinning out or turning to moire.
   ========================================================================== */

import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useMotionBudget } from '../../lib/capabilities'
import { Stage } from './Stage'
import { acquirePointer, pointerState, releasePointer } from './pointer'
import { clamp01, lag, useClothStage } from './useClothStage'
import { createWarpMaterial, type WarpUniforms } from './shaders/warp'

const COVER = 1.3
/** Thread width as a fraction of the pitch. Any wider and they merge. */
const THREAD_FRACTION = 0.42
/** Resting separation between the two sets of the shed. */
const SHED = 0.3
/** Segments along a thread. The bow is a gaussian, so it needs the verts. */
const THREAD_SEGMENTS = 48

const TILT = new THREE.Euler(-0.15, 0, 0)
const ORIGIN = new THREE.Vector3(0, 0, 0)
const CAMERA = { position: [0, 0.55, 6.4] as const, fov: 40 }

interface WarpProps {
  count: number
  progress: RefObject<number>
  bounds: RefObject<DOMRect | null>
}

function Warp({ count, progress, bounds }: WarpProps) {
  const viewport = useThree((state) => state.viewport)
  const camera = useThree((state) => state.camera)
  const mesh = useRef<THREE.InstancedMesh>(null)

  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(1, 1, 1, THREAD_SEGMENTS)
    const seeds = new Float32Array(count)
    for (let index = 0; index < count; index += 1) {
      seeds[index] = index / Math.max(count - 1, 1)
    }
    plane.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1))
    return plane
  }, [count])

  const material = useMemo(() => createWarpMaterial(), [])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  /* The plane the cursor is resolved against, in world space. Computed from
     the tilt rather than read off the group so it cannot go stale. */
  const worldPlane = useMemo(() => {
    const normal = new THREE.Vector3(0, 0, 1).applyEuler(TILT)
    return new THREE.Plane().setFromNormalAndCoplanarPoint(normal, ORIGIN)
  }, [])

  const inverseTilt = useMemo(() => new THREE.Euler(-TILT.x, 0, 0), [])
  const ndc = useMemo(() => new THREE.Vector2(), [])
  const ray = useMemo(() => new THREE.Raycaster(), [])
  const hitWorld = useMemo(() => new THREE.Vector3(), [])
  const hitLocal = useMemo(() => new THREE.Vector3(), [])
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const pointer = useRef(new THREE.Vector3(0, -900, 0))
  const gust = useRef(0)
  const laidOut = useRef({ width: -1, height: -1 })

  useFrame((state, delta) => {
    const uniforms = material.uniforms as WarpUniforms
    const live = pointerState()
    const rect = bounds.current

    uniforms.uTime.value = state.clock.elapsedTime
    uniforms.uScroll.value = clamp01(progress.current)

    /* Relayout only when the viewport actually moved. Rebuilding 140 matrices
       every frame would be pure waste. The record is written after the work
       succeeds, so a frame where the ref is not yet attached retries. */
    const width = viewport.width * COVER
    const height = viewport.height * COVER
    const current = laidOut.current
    const stale =
      Math.abs(width - current.width) > 0.02 || Math.abs(height - current.height) > 0.02
    const instance = mesh.current

    if (stale && instance) {
      laidOut.current = { width, height }
      const pitch = width / count
      for (let index = 0; index < count; index += 1) {
        dummy.position.set(
          (index - (count - 1) / 2) * pitch,
          0,
          index % 2 === 0 ? SHED : -SHED,
        )
        dummy.scale.set(pitch * THREAD_FRACTION, height, 1)
        dummy.rotation.set(0, 0, 0)
        dummy.updateMatrix()
        instance.setMatrixAt(index, dummy.matrix)
      }
      instance.instanceMatrix.needsUpdate = true
    }

    /* Resolve the cursor onto the tilted warp and back into group space, which
       is the space the shader does its arithmetic in. */
    let inside = false
    if (rect && live.seen) {
      inside =
        live.clientX >= rect.left &&
        live.clientX <= rect.right &&
        live.clientY >= rect.top &&
        live.clientY <= rect.bottom

      if (inside) {
        ndc.set(
          ((live.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1,
          -(((live.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1),
        )
        ray.setFromCamera(ndc, camera)
        if (ray.ray.intersectPlane(worldPlane, hitWorld)) {
          hitLocal.copy(hitWorld).applyEuler(inverseTilt)
          pointer.current.lerp(hitLocal, lag(delta, 0.12))
        }
      }
    }
    uniforms.uPointer.value.copy(pointer.current)

    const targetGust = inside ? live.speed : 0
    gust.current += (targetGust - gust.current) * lag(delta, 0.4)
    uniforms.uGust.value = gust.current
  })

  return (
    <group rotation={TILT}>
      <instancedMesh
        ref={mesh}
        args={[geometry, material, count]}
        frustumCulled={false}
      />
    </group>
  )
}

export interface WarpFieldProps {
  className?: string
}

export function WarpField({ className }: WarpFieldProps) {
  const budget = useMotionBudget()
  const hostRef = useRef<HTMLDivElement>(null)
  const { progress, bounds } = useClothStage(hostRef, budget.enabled)

  useEffect(() => {
    if (!budget.enabled) return
    acquirePointer()
    return () => releasePointer()
  }, [budget.enabled])

  if (!budget.enabled || budget.threads < 8) return null

  return (
    <div ref={hostRef} className={['cloth-host', className ?? ''].filter(Boolean).join(' ')}>
      <Stage camera={CAMERA} margin="200px">
        <Warp count={budget.threads} progress={progress} bounds={bounds} />
      </Stage>
    </div>
  )
}
