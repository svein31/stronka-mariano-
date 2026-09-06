/* ==========================================================================
   Pointer. One tracker for every scene.

   The canvases sit behind the DOM and never capture the pointer, so R3F's
   own state.pointer stays at zero. Scenes read from here instead, which also
   means the cloth responds while the cursor is over a heading sitting on top
   of it, which is the behaviour that actually feels alive.

   Ref-counted: the first scene to mount attaches the listener, the last to
   unmount removes it.
   ========================================================================== */

export interface PointerState {
  /** Normalised device coordinates, x and y in -1 to 1, y up. */
  x: number
  y: number
  /** Raw viewport coordinates, for scenes that map into their own bounds. */
  clientX: number
  clientY: number
  /**
   * 0 to 1, decaying. Rises with cursor speed so a still cursor lets the
   * cloth settle and a quick one kicks it.
   */
  speed: number
  /** True once the cursor has been seen at least once. */
  seen: boolean
}

const state: PointerState = { x: 0, y: 0, clientX: 0, clientY: 0, speed: 0, seen: false }

let listeners = 0
let lastX = 0
let lastY = 0
let frame = 0

function read(event: PointerEvent): void {
  const width = window.innerWidth || 1
  const height = window.innerHeight || 1

  const x = (event.clientX / width) * 2 - 1
  // Screen y grows downward; NDC y grows upward.
  const y = -((event.clientY / height) * 2 - 1)

  if (state.seen) {
    const travelled = Math.hypot(event.clientX - lastX, event.clientY - lastY)
    /* pointermove fires about once a frame and tick() decays by 7% a frame,
       so the equilibrium sits near travelled / 15. Dividing by 220 puts a
       moderate sweep around 0.4 and a genuine flick at the ceiling. */
    state.speed = Math.min(1, state.speed + travelled / 220)
  }

  lastX = event.clientX
  lastY = event.clientY
  state.x = x
  state.y = y
  state.clientX = event.clientX
  state.clientY = event.clientY
  state.seen = true
}

/** Decay runs on a frame loop only while something is listening. */
function tick(): void {
  state.speed *= 0.93
  if (state.speed < 0.001) state.speed = 0
  frame = requestAnimationFrame(tick)
}

export function acquirePointer(): void {
  listeners += 1
  if (listeners > 1) return
  window.addEventListener('pointermove', read, { passive: true })
  window.addEventListener('pointerdown', read, { passive: true })
  frame = requestAnimationFrame(tick)
}

export function releasePointer(): void {
  listeners = Math.max(0, listeners - 1)
  if (listeners > 0) return
  window.removeEventListener('pointermove', read)
  window.removeEventListener('pointerdown', read)
  cancelAnimationFrame(frame)
  frame = 0
  state.speed = 0
}

export function pointerState(): Readonly<PointerState> {
  return state
}
