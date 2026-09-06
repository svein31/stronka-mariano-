/* ==========================================================================
   Motes. Dust held in a shaft of light.

   Composable inside any Stage rather than owning a canvas, so a scene can
   carry its own atmosphere without a second WebGL context. Everything moves
   on the GPU: positions are generated once into a unit box and the wrap,
   the wander, and the scroll parallax all happen in the vertex shader, so
   the CPU never touches a buffer after mount.

   Only ever used on ink movements. Dust on paper is invisible, and a layer
   you cannot see is a layer that should not be running.
   ========================================================================== */

import { useEffect, useMemo, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useMotionBudget } from '../../lib/capabilities'
import { SIMPLEX_NOISE_GLSL } from './shaders/noise'
import { SHADER_PALETTE } from './shaders/palette'
import { clamp01, useClothProgress } from './useClothStage'

export interface MotesUniforms {
  /* ShaderMaterial wants a string index signature on its uniform map. */
  [uniform: string]: THREE.IUniform
  uTime: { value: number }
  /** 0 to 1 scroll progress. Motes streak against it, which sells depth. */
  uScroll: { value: number }
  /** Half-extents of the box the dust lives in, in world units. */
  uExtent: { value: THREE.Vector3 }
  uSize: { value: number }
  uPixelRatio: { value: number }
  uOpacity: { value: number }
  uDust: { value: THREE.Color }
  uGold: { value: THREE.Color }
}

const MOTES_VERTEX = /* glsl */ `
${SIMPLEX_NOISE_GLSL}

uniform float uTime;
uniform float uScroll;
uniform vec3  uExtent;
uniform float uSize;
uniform float uPixelRatio;

attribute float aOffset;
attribute float aDrift;
attribute float aScale;
attribute float aGold;

varying float vAlpha;
varying float vGold;

void main() {
  vGold = aGold;

  /* Rise. Each mote crosses the box on its own clock, slow enough that the
     movement is felt as a change in the room rather than seen as motion. */
  float t = fract(aOffset + uTime * (0.006 + aDrift * 0.018) - uScroll * 0.42);

  vec3 p;
  p.x = position.x * uExtent.x;
  p.z = position.z * uExtent.z;
  p.y = (t - 0.5) * uExtent.y;

  // Lateral wander, seeded per mote so the field never looks tiled.
  p.x += snoise(vec3(p.y * 0.26, aDrift * 9.1, uTime * 0.055)) * 0.60;
  p.z += snoise(vec3(p.x * 0.22, aDrift * 4.3 + 3.1, uTime * 0.048)) * 0.42;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float depth = clamp(-mv.z, 0.2, 24.0);

  // Out of focus in front of and behind the focal plane, sharp in between.
  vAlpha = aScale * smoothstep(0.5, 2.4, depth) * (1.0 - smoothstep(7.5, 14.0, depth));

  // Fade at the ends of the box so the wrap is never visible as a pop.
  vAlpha *= smoothstep(0.0, 0.17, t) * smoothstep(1.0, 0.83, t);

  gl_PointSize = uSize * aScale * uPixelRatio * (5.4 / depth);
}
`

const MOTES_FRAGMENT = /* glsl */ `
uniform vec3  uDust;
uniform vec3  uGold;
uniform float uOpacity;

varying float vAlpha;
varying float vGold;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float disc = smoothstep(0.5, 0.07, d);
  float alpha = disc * vAlpha * uOpacity;

  if (alpha < 0.004) discard;

  gl_FragColor = vec4(mix(uDust, uGold, vGold), alpha);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface MotesProps {
  /** Scroll progress to parallax against. Defaults to the owning scene's. */
  progress?: RefObject<number>
  /** Multiplier on the budget's mote count. */
  density?: number
  opacity?: number
}

export function Motes({ progress, density = 1, opacity = 1 }: MotesProps) {
  const budget = useMotionBudget()
  const viewport = useThree((state) => state.viewport)
  const inherited = useClothProgress()
  const scroll = progress ?? inherited

  const count = Math.max(0, Math.round(budget.motes * density))

  const geometry = useMemo(() => {
    const points = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const offsets = new Float32Array(count)
    const drifts = new Float32Array(count)
    const scales = new Float32Array(count)
    const golds = new Float32Array(count)

    /* Seeded so the dust is the same field on every load. A different cloud
       each visit reads as noise rather than as a room. */
    const random = mulberry32(0x5eed)

    for (let index = 0; index < count; index += 1) {
      // x and z carry the mote's column; y is unused, the shader owns it.
      positions[index * 3] = (random() - 0.5) * 2
      positions[index * 3 + 1] = 0
      positions[index * 3 + 2] = (random() - 0.5) * 2

      offsets[index] = random()
      drifts[index] = random()
      // Most motes are fine. A few are close to the light and much larger.
      const close = random()
      scales[index] = close > 0.94 ? 1.9 + random() * 1.5 : 0.42 + random() * 0.86
      golds[index] = random() > 0.88 ? 0.5 + random() * 0.5 : 0
    }

    points.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    points.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1))
    points.setAttribute('aDrift', new THREE.BufferAttribute(drifts, 1))
    points.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))
    points.setAttribute('aGold', new THREE.BufferAttribute(golds, 1))
    return points
  }, [count])

  const uniforms = useMemo<MotesUniforms>(
    () => ({
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uExtent: { value: new THREE.Vector3(1, 1, 1) },
      uSize: { value: 2.3 },
      uPixelRatio: { value: 1 },
      uOpacity: { value: opacity },
      uDust: { value: new THREE.Color(SHADER_PALETTE.washi) },
      uGold: { value: new THREE.Color(SHADER_PALETTE.kin) },
    }),
    [opacity],
  )

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: MOTES_VERTEX,
        fragmentShader: MOTES_FRAGMENT,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.NormalBlending,
      }),
    [uniforms],
  )

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame((state, delta) => {
    uniforms.uTime.value = state.clock.elapsedTime
    uniforms.uScroll.value = clamp01(scroll.current)
    uniforms.uPixelRatio.value = viewport.dpr

    // The box follows the frustum so density on screen stays constant.
    uniforms.uExtent.value.set(viewport.width * 1.25, viewport.height * 1.5, 7.5)

    // Settle in rather than appearing at full strength on the first frame.
    uniforms.uOpacity.value += (opacity - uniforms.uOpacity.value) * Math.min(1, delta * 1.6)
  })

  if (count < 1) return null

  return <points geometry={geometry} material={material} frustumCulled={false} />
}
