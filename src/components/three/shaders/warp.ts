/* ==========================================================================
   Warp. The threads on the loom.

   Real instanced geometry rather than a drawn-on effect, because the point of
   the scene is that the shed opens: alternate threads sit forward and back,
   and the cursor pushes them further apart so light comes in through the gap.
   That only reads as three-dimensional if the threads actually have depth.

   Each thread is shaded as a cylinder, which is what a thread is. Roundness
   comes from the across-thread coordinate, not from a normal map.
   ========================================================================== */

import * as THREE from 'three'
import { SHADER_PALETTE } from './palette'
import { SIMPLEX_NOISE_GLSL } from './noise'

export interface WarpUniforms {
  /* ShaderMaterial wants a string index signature on its uniform map. */
  [uniform: string]: THREE.IUniform
  uTime: { value: number }
  /** Cursor in group-local world space, on the plane of the warp. */
  uPointer: { value: THREE.Vector3 }
  /** 0 to 1. How hard the shed is being opened. */
  uGust: { value: number }
  /** 0 to 1. Scroll progress, which combs a wave down the warp. */
  uScroll: { value: number }
  uOpacity: { value: number }
  uThread: { value: THREE.Color }
  uGlow: { value: THREE.Color }
  uIndigo: { value: THREE.Color }
}

export const WARP_VERTEX = /* glsl */ `
${SIMPLEX_NOISE_GLSL}

uniform float uTime;
uniform vec3  uPointer;
uniform float uGust;
uniform float uScroll;

/* Per-instance identity, 0 to 1. Carries the phase and slub of one thread. */
attribute float aSeed;

varying float vAlong;
varying float vAcross;
varying float vShed;
varying float vOpen;
varying float vSeed;

void main() {
  vSeed = aSeed;
  vAlong = uv.y;

  // Across-thread coordinate in -1 to 1. The plane is a unit quad scaled by
  // the instance matrix, so position.x is already symmetric about zero.
  vAcross = clamp(position.x * 2.0, -1.0, 1.0);

  vec4 inst = instanceMatrix * vec4(position, 1.0);

  // Anisotropic falloff: the parting is narrow across the warp and tall along
  // it, so the shed opens as a slot rather than as a hole.
  float dx = inst.x - uPointer.x;
  float dy = inst.y - uPointer.y;
  float d2 = dx * dx * 2.6 + dy * dy * 0.85;
  float falloff = exp(-d2);

  // A small resting parting so the shed is never fully closed, plus the
  // cursor's own contribution on top.
  float push = falloff * (0.02 + uGust * 0.34);
  // Smooth sign, so the thread exactly under the cursor is the parting axis
  // and stays put instead of snapping sideways.
  float side = dx / (abs(dx) + 0.045);

  // Each thread breathes at its own phase and amplitude. The variation is
  // seeded, not random per frame, so the warp keeps its identity.
  float slub = 0.55 + 0.9 * fract(aSeed * 7.13);
  float sway = sin(inst.y * 1.15 + uTime * 0.42 + aSeed * 6.28318) * 0.020 * slub;
       sway += snoise(vec3(inst.y * 0.55, uTime * 0.11, aSeed * 4.0)) * 0.026;

  // Scrolling combs a coherent wave down the whole warp, the way the beater
  // pushes weft home. It shares a phase across threads, which is what makes
  // it read as one action on the loom rather than as individual flutter.
  sway += sin(inst.y * 0.75 - uScroll * 7.5) * 0.055 * smoothstep(0.0, 0.18, uScroll);

  // The shed. inst.z carries which set this thread belongs to; the cursor
  // drives the two sets further apart, which is what lets light in.
  float shed = sign(inst.z) * falloff * uGust * 0.45;

  vec3 displaced = inst.xyz + vec3(side * push + sway, 0.0, shed);

  vShed = sign(inst.z);
  vOpen = falloff * uGust;

  vec4 world = modelMatrix * vec4(displaced, 1.0);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

export const WARP_FRAGMENT = /* glsl */ `
uniform vec3  uThread;
uniform vec3  uGlow;
uniform vec3  uIndigo;
uniform float uOpacity;

varying float vAlong;
varying float vAcross;
varying float vShed;
varying float vOpen;
varying float vSeed;

void main() {
  // Cylinder. A thread is round, so brightness falls off from its crown.
  float round = sqrt(max(0.0, 1.0 - vAcross * vAcross));

  // Warp sits in a raking light from the upper left, cool from below.
  float key = 0.34 + round * 0.78;

  // Slub: hand-spun thread is not even, and the unevenness is the point.
  float slub = 0.72 + 0.42 * fract(vSeed * 13.71);
  key *= slub;

  vec3 colour = uThread * key;

  // A fine highlight along the crown, aged gold rather than white.
  colour += uGlow * pow(round, 5.0) * 0.26;

  // Threads at the back of the shed sit in indigo shadow.
  colour = mix(colour, uIndigo * 0.72, clamp(-vShed * 0.42 + 0.18, 0.0, 0.62));

  // Where the shed is open, light comes through the gap from behind.
  colour += uGlow * vOpen * round * 0.30;

  // Threads dissolve at their ends rather than stopping at a hard line.
  float ends = smoothstep(0.0, 0.13, vAlong) * smoothstep(1.0, 0.87, vAlong);
  float alpha = smoothstep(0.03, 0.34, round) * ends * uOpacity;

  if (alpha < 0.003) discard;

  gl_FragColor = vec4(colour, alpha);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

/**
 * Undyed cotton in a raking light. Neither the ink hairline nor the paper
 * hairline on its own spans enough range to read as a lit cylinder, so the
 * thread colour sits between them and the shader's key term does the rest.
 */
function threadColour(): THREE.Color {
  return new THREE.Color(SHADER_PALETTE.sumiLine).lerp(
    new THREE.Color(SHADER_PALETTE.washiLine),
    0.68,
  )
}

export function createWarpUniforms(): WarpUniforms {
  return {
    uTime: { value: 0 },
    uPointer: { value: new THREE.Vector3(0, 0, 0) },
    uGust: { value: 0 },
    uScroll: { value: 0 },
    uOpacity: { value: 1 },
    uThread: { value: threadColour() },
    uGlow: { value: new THREE.Color(SHADER_PALETTE.kin) },
    uIndigo: { value: new THREE.Color(SHADER_PALETTE.ai) },
  }
}

export function createWarpMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: createWarpUniforms(),
    vertexShader: WARP_VERTEX,
    fragmentShader: WARP_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
}
