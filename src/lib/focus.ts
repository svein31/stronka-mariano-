/* ==========================================================================
   Focus management for the two overlays: the navigation panel and the bag.

   Both are `aria-modal` surfaces, so both owe the visitor three things:
   focus moves in when they open, Tab cannot escape to the page behind, and
   focus returns to the control that opened them. Getting the third one wrong
   is the common failure, because a keyboard visitor who closes a drawer and
   lands back at the top of the document has lost their place in the page.
   ========================================================================== */

import { useEffect, useRef, type RefObject } from 'react'

/* Everything a visitor can actually reach. `[tabindex="-1"]` is excluded
   because it is programmatically focusable only, and that is what the route
   title uses. */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * getClientRects rather than offsetParent, because offsetParent is null for
 * anything inside a fixed-position container and both of these overlays are
 * fixed.
 */
function reachable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.getClientRects().length > 0,
  )
}

export interface FocusTrapOptions {
  /** Called on Escape while the trap is live. The overlay decides what that means. */
  onEscape?: () => void
}

export function useFocusTrap(
  container: RefObject<HTMLElement | null>,
  active: boolean,
  options: FocusTrapOptions = {},
): void {
  /* Held in a ref rather than in the dependency list. Callers pass an inline
     arrow, which changes identity every render, and an effect that re-ran on
     every render would tear the trap down and restore focus to the opener
     while the overlay was still open. */
  const escape = useRef(options.onEscape)
  escape.current = options.onEscape

  useEffect(() => {
    if (!active) return

    const surface = container.current
    if (!surface) return

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null

    // One frame, so the surface is actually visible before focus is moved
    // into it. Focusing a `visibility: hidden` node is silently dropped.
    const frame = requestAnimationFrame(() => {
      const targets = reachable(surface)
      ;(targets[0] ?? surface).focus()
    })

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        escape.current?.()
        return
      }

      if (event.key !== 'Tab') return

      const targets = reachable(surface)
      if (targets.length === 0) {
        event.preventDefault()
        return
      }

      const first = targets[0]
      const last = targets[targets.length - 1]
      const current = document.activeElement

      if (event.shiftKey && (current === first || !surface.contains(current))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && current === last) {
        event.preventDefault()
        first.focus()
      }
    }

    /* Captured on the document rather than the surface, because focus can
       land outside it via a browser UI interaction and then Tab away. */
    document.addEventListener('keydown', onKeyDown, true)

    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown, true)
      opener?.focus()
    }
  }, [active, container])
}
