/* ==========================================================================
   Cloth swatch. The product route's material study.

   A piece of the actual garment, cut from its own cloth parameters, that the
   visitor can turn. Turning it is the whole point: at an angle the drape
   stops being a picture and starts being an object, and the sheen sweeps
   across the surface because the light stays put while the cloth moves.

   The turn is a range input rather than a drag handler. A slider is keyboard
   operable, announces its value, and works on a touch screen without
   stealing the scroll, which a pointer-drag surface does not.

   Changing colourway updates the uniform in place instead of rebuilding the
   material, so picking a colour is instant rather than a shader compile.
   ========================================================================== */

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useMotionBudget } from '../../lib/capabilities'
import { Stage } from './Stage'
import { acquirePointer, pointerState, releasePointer } from './pointer'
import { clamp01, lag, useClothStage } from './useClothStage'
import { SHADER_PALETTE } from './shaders/palette'
import { createClothMaterial, type ClothParameters, type ClothUniforms } from './shaders/cloth'

/** Generous, so the cloth still fills the frame at the limits of the turn. */
const COVER = 2
const SWATCH_CAMERA = { position: [0, 0, 3.4] as const, fov: 34 }
const REST_TILT = -0.17
const VOID = new THREE.Color(SHADER_PALETTE.sumiVoid)

export const TURN_LIMIT = 40

interface PlaneProps {
  drape: number
  sheen: number
  weave: number
  tint: string
  turn: RefObject<number>
  progress: RefObject<number>
  bounds: RefObject<DOMRect | null>
}

function SwatchPlane({ drape, sheen, weave, tint, turn, progress, bounds }: PlaneProps) {
  const budget = useMotionBudget()
  const viewport = useThree((state) => state.viewport)
  const group = useRef<THREE.Group>(null)

  const segments = Math.max(24, budget.clothSegments)

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(1, 1, segments, segments),
    [segments],
  )

  /* Tint is deliberately absent from the key. It is written into the uniform
     below, so switching colourway costs nothing. */
  const material = useMemo(
    () => createClothMaterial([3, 3], { drape, sheen, weave }),
    [drape, sheen, weave],
  )

  useEffect(() => {
    const uniforms = material.uniforms as ClothUniforms
    const ink = new THREE.Color(tint)
    uniforms.uInk.value.copy(ink)
    uniforms.uDeep.value.copy(ink.clone().lerp(VOID, 0.55))
  }, [material, tint])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  const pointer = useRef(new THREE.Vector2(0, 0))
  const gust = useRef(0)
  const turned = useRef(0)

  useFrame((state, delta) => {
    const uniforms = material.uniforms as ClothUniforms
    const live = pointerState()
    const rect = bounds.current

    const width = viewport.width * COVER
    const height = viewport.height * COVER
    uniforms.uSize.value.set(width, height)
    uniforms.uTime.value = state.clock.elapsedTime

    /* A swatch is studied, not scrolled past, so the scroll only settles it
       slightly rather than leaning the whole sheet back. */
    uniforms.uScroll.value = clamp01(progress.current) * 0.35

    let targetX = 0
    let targetY = 0
    let inside = false

    if (rect && live.seen) {
      inside =
        live.clientX >= rect.left &&
        live.clientX <= rect.right &&
        live.clientY >= rect.top &&
        live.clientY <= rect.bottom
      if (inside) {
        targetX = (((live.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1) * width * 0.5
        targetY = -(((live.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1) * height * 0.5
      }
    }

    const trackLag = lag(delta, 0.1)
    pointer.current.x += (targetX - pointer.current.x) * trackLag
    pointer.current.y += (targetY - pointer.current.y) * trackLag
    uniforms.uPointer.value.copy(pointer.current)

    const targetGust = inside ? live.speed : 0
    gust.current += (targetGust - gust.current) * lag(delta, 0.38)
    uniforms.uGust.value = gust.current

    /* Ease toward the slider value rather than snapping to it, so a click on
       the track still reads as the cloth being turned by hand. */
    turned.current += (turn.current - turned.current) * lag(delta, 0.16)
    if (group.current) {
      group.current.rotation.y = turned.current
    }
  })

  return (
    <group ref={group} rotation={[REST_TILT, 0, 0]}>
      <mesh geometry={geometry} material={material} frustumCulled={false} />
    </group>
  )
}

export interface ClothSwatchProps {
  /** The garment's own cloth parameters. */
  cloth: Omit<ClothParameters, 'tint' | 'opacity'>
  /** Active colourway, as a hex string from the collection data. */
  tint: string
  /** Accessible name for the turn control. */
  label: string
  className?: string
}

export function ClothSwatch({ cloth, tint, label, className }: ClothSwatchProps) {
  const budget = useMotionBudget()
  const hostRef = useRef<HTMLDivElement>(null)
  const { progress, bounds } = useClothStage(hostRef, budget.enabled)
  const turn = useRef(0)
  const [degrees, setDegrees] = useState(0)
  const [failed, setFailed] = useState(false)
  const controlId = useId()

  useEffect(() => {
    if (!budget.enabled) return
    acquirePointer()
    return () => releasePointer()
  }, [budget.enabled])

  if (!budget.enabled || failed) return null

  const onTurn = (event: ChangeEvent<HTMLInputElement>): void => {
    const value = Number(event.target.value)
    setDegrees(value)
    turn.current = (value * Math.PI) / 180
  }

  return (
    <div className={['swatch', className ?? ''].filter(Boolean).join(' ')}>
      <div ref={hostRef} className="swatch__frame">
        <Stage camera={SWATCH_CAMERA} margin="80px" className="swatch__gl" onFailure={() => setFailed(true)}>
          <SwatchPlane
            drape={cloth.drape}
            sheen={cloth.sheen}
            weave={cloth.weave}
            tint={tint}
            turn={turn}
            progress={progress}
            bounds={bounds}
          />
        </Stage>
      </div>

      <div className="swatch__control">
        <label className="field__label" htmlFor={controlId}>
          {label}
        </label>
        <input
          id={controlId}
          className="swatch__slider"
          type="range"
          min={-TURN_LIMIT}
          max={TURN_LIMIT}
          step={1}
          value={degrees}
          onChange={onTurn}
          aria-valuetext={`${degrees} degrees`}
        />
      </div>
    </div>
  )
}
