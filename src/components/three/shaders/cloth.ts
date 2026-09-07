

import * as THREE from 'three'
import { SHADER_PALETTE } from './palette'
import { SIMPLEX_NOISE_GLSL } from './noise'

export interface ClothParameters {

  drape: number

  sheen: number

  weave: number

  tint?: string

  opacity?: number
}

export interface ClothUniforms {

  [uniform: string]: THREE.IUniform
  uTime: { value: number }

  uPointer: { value: THREE.Vector2 }

  uGust: { value: number }
  uDrape: { value: number }
  uSheen: { value: number }
  uWeave: { value: number }
  uSize: { value: THREE.Vector2 }

  uScroll: { value: number }
  uOpacity: { value: number }
  uBase: { value: THREE.Color }
  uDeep: { value: THREE.Color }
  uIndigo: { value: THREE.Color }
  uCanvas: { value: THREE.Color }
}

export const CLOTH_VERTEX =  `
${SIMPLEX_NOISE_GLSL}

uniform float uTime;
uniform vec2  uPointer;
uniform float uGust;
uniform float uDrape;
uniform vec2  uSize;
uniform float uScroll;

varying vec2  vUv;
varying vec3  vNormal;
varying vec3  vView;
varying float vElevation;
varying float vHang;

float elevation(vec2 p, vec2 surfaceUv) {
  float t = uTime;

  // Three octaves: the broad fall of the cloth, a mid fold, a fine ripple.
  float e  = snoise(vec3(p * 0.30, t * 0.090)) * 0.92;
        e += snoise(vec3(p * 0.78, t * 0.150)) * 0.33;
        e += snoise(vec3(p * 2.10, t * 0.230)) * 0.10;

  // Hang. Cloth is pinned along the top edge and released below, so the
  // further down it goes the more it is permitted to move.
  float hang = smoothstep(1.0, 0.0, surfaceUv.y);
  float swing = mix(0.16, 1.0, pow(hang, 1.32));

  // One deep fold running the length, the way an open coat falls.
  float fold = sin(p.x * 0.85 + t * 0.11 + snoise(vec3(p * 0.2, t * 0.05)) * 1.7);
  e += fold * 0.30 * swing;

  // The scroll leans the cloth back as the visitor unrolls past it.
  e += snoise(vec3(p * 0.16, uScroll * 2.4)) * 0.42 * uScroll;

  // Pointer gust: a gaussian following the cursor with lag.
  float d = distance(p, uPointer);
  e += exp(-d * d * 0.26) * uGust * 1.45 * swing;

  return e * swing * uDrape;
}

void main() {
  vUv = uv;

  vec2 base = position.xy * uSize;

  // Epsilon scaled to the plane so the derived normal holds at any size.
  float eps = max(uSize.x, uSize.y) / 220.0;

  float e  = elevation(base, uv);
  float ex = elevation(base + vec2(eps, 0.0), uv + vec2(eps / uSize.x, 0.0));
  float ey = elevation(base + vec2(0.0, eps), uv + vec2(0.0, eps / uSize.y));

  vec3 displaced = vec3(base, e);

  vec3 tangentX = vec3(eps, 0.0, ex - e);
  vec3 tangentY = vec3(0.0, eps, ey - e);
  vec3 derived = normalize(cross(tangentX, tangentY));

  vElevation = e;
  vHang = smoothstep(1.0, 0.0, uv.y);
  vNormal = normalize(normalMatrix * derived);

  vec4 world = modelMatrix * vec4(displaced, 1.0);
  vView = normalize(cameraPosition - world.xyz);

  gl_Position = projectionMatrix * viewMatrix * world;
}
`

export const CLOTH_FRAGMENT =  `
uniform vec3  uBase;
uniform vec3  uDeep;
uniform vec3  uIndigo;
uniform vec3  uCanvas;
uniform float uSheen;
uniform float uWeave;
uniform float uOpacity;
uniform vec2  uSize;

varying vec2  vUv;
varying vec3  vNormal;
varying vec3  vView;
varying float vElevation;
varying float vHang;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vView);

  // A single high window from the upper left, and a cold bounce from below.
  vec3 keyDir  = normalize(vec3(-0.52, 0.74, 0.43));
  vec3 fillDir = normalize(vec3(0.38, -0.62, 0.68));

  float key  = max(dot(N, keyDir), 0.0);
  float fill = max(dot(N, fillDir), 0.0);

  // Fabric shading. Tone gradates with elevation: valleys inked dense, ridges thin.
  float depth = smoothstep(-0.95, 0.95, vElevation);
  vec3 base = mix(uBase, uDeep, 1.0 - depth);

  // Indigo settles into the deepest part of the wash, where dye pools.
  float printed = smoothstep(0.3, 0.5, sin(vUv.x * 19.0 + sin(vUv.y * 12.0)) * sin(vUv.y * 17.0));
  base = mix(base, uIndigo, printed * 0.65);

  vec3 colour = base * (0.26 + key * 0.88 + fill * 0.17);

  // Anisotropic sheen. Silk catches light along the thread, not at a point,
  // so the specular exponent is driven by the fabric's own sheen value.
  vec3 half_ = normalize(keyDir + V);
  float exponent = mix(10.0, 110.0, uSheen);
  float gloss = pow(max(dot(N, half_), 0.0), exponent);
  colour += uCanvas * gloss * (0.16 + uSheen * 0.66);

  // The rim where cloth turns away from the window and catches it edge on.
  float rim = pow(1.0 - max(dot(N, V), 0.0), 2.7);
  colour += uCanvas * rim * (0.10 + uSheen * 0.18);

  float threads = max(uSize.x, uSize.y) * 46.0;
  float warpPhase = vUv.x * threads;
  float weftPhase = vUv.y * threads * 0.86;

  float warp = sin(warpPhase) * 0.5 + 0.5;
  float weft = sin(weftPhase) * 0.5 + 0.5;
  float slub = warp * 0.62 + weft * 0.38;

  float shimmer = max(fwidth(warpPhase), fwidth(weftPhase));
  float legible = 1.0 - smoothstep(1.1, 2.6, shimmer);

  colour *= 1.0 - slub * uWeave * 0.13 * legible;

  // Halo of loose fibre standing off the surface, backlit at the shoulder.
  float halo = pow(max(dot(N, keyDir), 0.0), 0.6) * vHang;
  colour += uIndigo * halo * uWeave * 0.10;

  // Fade the plane off at its edges so it never shows a rectangular border.
  float edgeX = smoothstep(0.0, 0.20, vUv.x) * smoothstep(1.0, 0.80, vUv.x);
  float edgeY = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
  float alpha = edgeX * mix(0.68, 1.0, edgeY) * uOpacity;

  if (alpha < 0.002) discard;

  gl_FragColor = vec4(colour, alpha);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export function createClothUniforms(
  size: readonly [number, number],
  parameters: ClothParameters = { drape: 0.75, sheen: 0.25, weave: 0.4 },
): ClothUniforms {
  const ink = new THREE.Color(parameters.tint ?? SHADER_PALETTE.ecru)

  const deep = ink.clone().lerp(new THREE.Color(SHADER_PALETTE.charcoal), 0.55)

  return {
    uTime: { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uGust: { value: 0 },
    uDrape: { value: parameters.drape },
    uSheen: { value: parameters.sheen },
    uWeave: { value: parameters.weave },
    uSize: { value: new THREE.Vector2(size[0], size[1]) },
    uScroll: { value: 0 },
    uOpacity: { value: parameters.opacity ?? 1 },
    uBase: { value: ink },
    uDeep: { value: deep },
    uIndigo: { value: new THREE.Color(SHADER_PALETTE.indigo) },
    uCanvas: { value: new THREE.Color(SHADER_PALETTE.canvas) },
  }
}

export function createClothMaterial(
  size: readonly [number, number],
  parameters: ClothParameters = { drape: 0.75, sheen: 0.25, weave: 0.4 },
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: createClothUniforms(size, parameters),
    vertexShader: CLOTH_VERTEX,
    fragmentShader: CLOTH_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
}
