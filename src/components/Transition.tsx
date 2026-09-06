/* ==========================================================================
   Route transitions.

   Ink sweeps up from the bottom edge, the seal lands once the viewport is
   covered, the route changes underneath, then the ink clears downward. One
   panel, two movements, and the visitor is never shown a half-built page.

   Three things this file owns that are easy to forget:
   1. Focus moves to the new page title, because a route change is a context
      change and a screen reader needs to be told.
   2. Scroll memory, so the back button returns to where the visitor was
      rather than to the top of a long scroll.
   3. Reduced motion skips the veil entirely and navigates immediately.
   ========================================================================== */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { Link, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import gsap from 'gsap'
import { useCapabilities } from '../lib/capabilities'
import { EASE } from '../lib/motion'
import { Seal } from './Seal'

const COVER = 0.62
const CLEAR = 0.78
const HOLD = 0.16

interface TransitionValue {
  travel: (to: string) => void
  /** True while the veil is covering the viewport. */
  traveling: boolean
}

const TransitionContext = createContext<TransitionValue>({
  travel: () => undefined,
  traveling: false,
})

export function useTravel(): (to: string) => void {
  return useContext(TransitionContext).travel
}

export function useTransitioning(): boolean {
  return useContext(TransitionContext).traveling
}

/** Scroll positions keyed by history entry, so back returns to the right fold. */
const scrollMemory = new Map<string, number>()

export function TransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const navigationType = useNavigationType()
  const { reducedMotion, scroll, requestRefresh } = useCapabilities()

  const veilRef = useRef<HTMLDivElement>(null)
  const sealRef = useRef<HTMLSpanElement>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const [traveling, setTraveling] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  const travel = useCallback(
    (to: string) => {
      if (traveling) return
      if (to === location.pathname + location.search) return

      if (reducedMotion) {
        navigate(to)
        return
      }

      const veil = veilRef.current
      if (!veil) {
        navigate(to)
        return
      }

      setTraveling(true)
      timelineRef.current?.kill()

      const timeline = gsap.timeline({
        onComplete: () => {
          setTraveling(false)
          timelineRef.current = null
        },
      })

      timeline
        .set(veil, { pointerEvents: 'auto', transformOrigin: 'bottom center', scaleY: 0 })
        .to(veil, { scaleY: 1, duration: COVER, ease: EASE.inOutQuart })
        .fromTo(
          sealRef.current,
          { scale: 1.35, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.4, ease: EASE.outExpo },
          COVER - 0.18,
        )
        .call(() => {
          navigate(to)
        })
        .to(sealRef.current, { opacity: 0, duration: 0.24, ease: 'power2.out' }, `+=${HOLD}`)
        .set(veil, { transformOrigin: 'top center' })
        .to(veil, { scaleY: 0, duration: CLEAR, ease: EASE.inOutQuart })
        .set(veil, { pointerEvents: 'none' })

      timelineRef.current = timeline
    },
    [traveling, location.pathname, location.search, reducedMotion, navigate],
  )

  /* --- Scroll position on route change ----------------------------------- */
  useEffect(() => {
    if (navigationType === 'POP') {
      const remembered = scrollMemory.get(location.key)
      if (remembered !== undefined) {
        scroll.scrollTo(remembered)
      } else {
        scroll.reset()
      }
    } else {
      scroll.reset()
    }

    // The outgoing entry keeps the position it had when we left it.
    return () => {
      scrollMemory.set(location.key, window.scrollY)
    }
  }, [location.key, navigationType, scroll])

  /* --- Focus and announcement on route change ---------------------------- */
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }

    // One frame, so the new route has actually committed to the DOM.
    const frame = requestAnimationFrame(() => {
      const title = document.getElementById('route-title')
      title?.focus({ preventScroll: true })
      setAnnouncement(title?.textContent?.trim() ?? '')
      requestRefresh()
    })

    return () => cancelAnimationFrame(frame)
  }, [location.pathname, requestRefresh])

  /* --- Kill an in-flight veil if unmounted mid-transition ---------------- */
  useEffect(() => {
    return () => {
      timelineRef.current?.kill()
    }
  }, [])

  /* The browser's own scroll restoration fights Lenis, so we take it over. */
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  const value = useMemo<TransitionValue>(() => ({ travel, traveling }), [travel, traveling])

  return (
    <TransitionContext.Provider value={value}>
      {children}

      <div className="veil" ref={veilRef} aria-hidden="true">
        <span className="veil__seal" ref={sealRef}>
          <Seal />
        </span>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </TransitionContext.Provider>
  )
}

/* --- Router-aware link ----------------------------------------------------
   A real anchor with a real href, so middle-click, command-click, and
   right-click all behave like the browser says they should. Only a plain
   left-click is intercepted to play the veil. */

type SumiLinkProps = ComponentProps<typeof Link>

export function SumiLink({ onClick, ...rest }: SumiLinkProps) {
  const travel = useTravel()

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (event.defaultPrevented) return
    if (event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (rest.target === '_blank') return

    event.preventDefault()
    travel(typeof rest.to === 'string' ? rest.to : rest.to.pathname ?? '/')
  }

  return <Link {...rest} onClick={handleClick} />
}

/** Sets document title from a route. Kept here so every route agrees. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])
}
