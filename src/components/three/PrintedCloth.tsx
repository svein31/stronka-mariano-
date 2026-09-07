

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

const COVER = 1.4

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

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(1, 1, segments, Math.max(12, Math.round(segments * 0.75))),
    [segments],
  )

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

  const pointer = useRef(new THREE.Vector2(0, 0))
  const gust = useRef(0)
  const drift = useRef(new THREE.Vector2(0, 0))

  useFrame((state, delta) => {
    const uniforms = material.uniforms as ClothUniforms
    const live = pointerState()
    const rect = bounds.current

    const width = viewport.width * cover
    const height = viewport.height * cover
    uniforms.uSize.value.set(width, height)
    uniforms.uTime.value = state.clock.elapsedTime

    const raw = clamp01((progress.current - LEAN_START) / (1 - LEAN_START))
    uniforms.uScroll.value = raw

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

    const trackLag = lag(delta, 0.09)
    const gustLag = lag(delta, 0.34)

    pointer.current.x += (targetX - pointer.current.x) * trackLag
    pointer.current.y += (targetY - pointer.current.y) * trackLag
    uniforms.uPointer.value.copy(pointer.current)

    const targetGust = inside ? live.speed : 0
    gust.current += (targetGust - gust.current) * gustLag
    uniforms.uGust.value = gust.current

    const driftLag = lag(delta, 0.5)
    drift.current.x += (-targetX * 0.028 - drift.current.x) * driftLag
    drift.current.y += (-targetY * 0.02 - drift.current.y) * driftLag
    if (group.current) {
      group.current.position.x = drift.current.x
      group.current.position.y = drift.current.y
      group.current.rotation.y = (progress.current-.5)*.32
      group.current.rotation.x = (progress.current-.5)*-.12
      state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, HERO_CAMERA.position[2] - progress.current*.9, lag(delta,.4))
    }
  })

  return (
    <group ref={group}>
      <mesh geometry={geometry} material={material} frustumCulled={false} />
    </group>
  )
}

const HERO_CLOTH: ClothParameters = { drape: 0.46, sheen: 0.08, weave: 0.8, tint: '#d7c9b0' }

export interface PrintedClothProps {

  cloth?: ClothParameters
  className?: string

  children?: ReactNode
}

export function PrintedCloth({ cloth = HERO_CLOTH, className, children }: PrintedClothProps) {
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
