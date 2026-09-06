/* ==========================================================================
   InkPlate. The signature image container.

   Photography is supplied by the client, so every plate must look composed
   before the asset exists and resolve automatically after. Until a file lands
   in public/media the plate renders a procedural bokashi wash seeded from the
   slot name, which means two plates never look alike and none of them look
   broken.

   The fallback carries the alt text through role="img" and aria-label so the
   composition still means something to a screen reader.
   ========================================================================== */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { candidatesFor, isResolved, knownPath, markResolved, slotRegistry } from '../lib/media'
import { scheduleRefresh } from '../lib/motion'

/* --- Deterministic noise -------------------------------------------------
   FNV-1a over the slot name, then a mulberry32 PRNG. Seeding from the slot
   means the wash for a given garment is stable across reloads and across
   visitors, which matters because the plates sit next to each other. */

function hashSlot(slot: string): number {
  let hash = 2166136261
  for (let index = 0; index < slot.length; index += 1) {
    hash ^= slot.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* Paper grain, rasterised once by the browser and tiled by every plate. */
const GRAIN_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">` +
  `<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" ` +
  `numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/>` +
  `</filter><rect width="180" height="180" filter="url(#n)" opacity="0.46"/></svg>`

const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(GRAIN_SVG)}")`

/** Bokashi: ink blooms gradating off a brush, composed from the slot seed. */
function bokashiFor(slot: string): CSSProperties {
  const random = mulberry32(hashSlot(slot))
  const blooms = Array.from({ length: 5 }, () => ({
    x: (random() * 100).toFixed(1),
    y: (random() * 100).toFixed(1),
    w: (34 + random() * 46).toFixed(1),
    h: (28 + random() * 40).toFixed(1),
    strength: (0.22 + random() * 0.4).toFixed(3),
  }))

  const layers = blooms.map(
    (bloom) =>
      `radial-gradient(${bloom.w}% ${bloom.h}% at ${bloom.x}% ${bloom.y}%, ` +
      `oklch(0.26 0.012 265 / ${bloom.strength}), oklch(0.26 0.012 265 / 0) 72%)`,
  )

  // One dominant directional wash, the way a loaded brush thins across paper.
  const angle = Math.floor(random() * 360)
  layers.push(
    `linear-gradient(${angle}deg, oklch(0.2 0.01 265 / 0.82) 0%, ` +
      `oklch(0.2 0.01 265 / 0.18) 46%, oklch(0.2 0.01 265 / 0) 78%)`,
  )

  // Indigo pushed into the deepest part of the wash.
  layers.push(
    `radial-gradient(120% 90% at ${(20 + random() * 60).toFixed(1)}% 100%, ` +
      `oklch(0.34 0.065 258 / 0.34), oklch(0.34 0.065 258 / 0) 68%)`,
  )

  layers.push(GRAIN)

  return {
    backgroundColor: 'var(--ground-lift)',
    backgroundImage: layers.join(', '),
    backgroundSize: blooms.map(() => '100% 100%').concat(['100% 100%', '100% 100%', '180px 180px']).join(', '),
  }
}

/* --- Slot probing -------------------------------------------------------- */

type SlotState = 'resolved' | 'probing' | 'absent'

interface ProbeResult {
  state: SlotState
  path: string | null
}

function probeSlot(slot: string): ProbeResult {
  const cached = isResolved(slot)
  if (cached === false) return { state: 'absent', path: null }
  if (cached === true) return { state: 'resolved', path: knownPath(slot) }
  return { state: 'probing', path: candidatesFor(slot)[0] }
}

export interface InkPlateProps {
  /** Filename stem in public/media. Must exist in lib/media.ts. */
  slot: string
  alt: string
  /** CSS aspect-ratio. Defaults to the ratio documented for this slot. */
  ratio?: string
  className?: string
  /** Above the fold, so fetch eagerly and at high priority. */
  priority?: boolean
  /** Suppress the hover grade lift, for thumbnails and bag lines. */
  static?: boolean
  /** Object position, defaults to centre. */
  position?: string
  children?: ReactNode
}

export function InkPlate({
  slot,
  alt,
  ratio,
  className,
  priority = false,
  static: isStatic = false,
  position = 'center',
  children,
}: InkPlateProps) {
  const registry = slotRegistry.get(slot)
  const aspect = ratio ?? registry?.ratio ?? '3 / 4'

  const [probe, setProbe] = useState<ProbeResult>(() => probeSlot(slot))
  const candidates = useMemo(() => candidatesFor(slot), [slot])
  const fallback = useMemo(() => bokashiFor(slot), [slot])

  const onError = useCallback(() => {
    setProbe((current) => {
      if (current.path === null) return current
      const index = candidates.indexOf(current.path)
      const next = candidates[index + 1]
      if (next) return { state: 'probing', path: next }

      // Every extension exhausted. Cache the miss so this plate never probes
      // again, and render the composed wash for the rest of the session.
      markResolved(slot, null)
      return { state: 'absent', path: null }
    })
  }, [candidates, slot])

  const onLoad = useCallback(() => {
    setProbe((current) => {
      if (current.state === 'resolved') return current
      if (current.path === null) return current
      markResolved(slot, current.path)
      scheduleRefresh()
      return { state: 'resolved', path: current.path }
    })
  }, [slot])

  // Re-probe when a slot changes identity, and once after first paint in case
  // an asset was added while the session was already running.
  useEffect(() => {
    setProbe(probeSlot(slot))
  }, [slot])

  const classes = ['plate', isStatic ? 'plate--static' : '', className ?? '']
    .filter(Boolean)
    .join(' ')

  const style: CSSProperties = { aspectRatio: aspect }

  const resolved = probe.state === 'resolved' && probe.path !== null

  return (
    <div className={classes} style={style} data-slot-state={resolved ? 'resolved' : 'placeholder'}>
      {!resolved ? (
        <>
          <span className="plate__fallback" style={fallback} aria-hidden="true" />
          <span className="plate__slot" role="img" aria-label={`Photograph unavailable. ${alt}`}>
            {probe.state === 'absent' ? 'Photograph forthcoming' : 'Loading photograph'}
          </span>
        </>
      ) : null}
      {probe.path ? (
        <img
          key={probe.path}
          className="plate__media"
          src={probe.path}
          alt={resolved ? alt : ''}
          aria-hidden={!resolved || undefined}
          width={registry?.min[0]}
          height={registry?.min[1]}
          decoding={priority ? 'sync' : 'async'}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          onError={onError}
          onLoad={onLoad}
          style={{ objectPosition: position, visibility: resolved ? 'visible' : 'hidden' }}
        />
      ) : null}
      <span className="plate__grade" aria-hidden="true" />
      <span className="plate__wash" aria-hidden="true" />
      {children}
    </div>
  )
}
