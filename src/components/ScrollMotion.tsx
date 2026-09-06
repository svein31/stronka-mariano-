/* ==========================================================================
   Scroll motion primitives.

   Five components and one rule. The rule: nothing here ever sets a hidden
   state in CSS. Every primitive applies its starting values from JavaScript,
   and only when motion is permitted. So a visitor with
   `prefers-reduced-motion`, or with scripts blocked, or on hardware that
   fails the capability check, receives the finished composition rather than
   an empty section. That is the contract PRODUCT.md makes, and it is why the
   reduced-motion branch of every function below is simply `return`.

   Every useGSAP call sets `revertOnUpdate`. Without it the hook defers its
   cleanup to unmount whenever `dependencies` is non-empty, so a dependency
   change would stack a second set of tweens on top of the first.
   ========================================================================== */

import {
  createElement,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
  type RefObject,
} from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import { useMotionAllowed } from '../lib/capabilities'
import { DUR, EASE, revealPlate } from '../lib/motion'

/* --- Rise -----------------------------------------------------------------
   The default reveal. Lifts from below and settles. */

export interface RiseProps {
  children: ReactNode
  className?: string
  /** Element to render. Defaults to a div. */
  as?: ElementType
  /** Pixels of travel. Small on purpose: this is a settle, not an entrance. */
  distance?: number
  delay?: number
  duration?: number
  /** Where in the viewport the reveal fires, as a ScrollTrigger position. */
  start?: string
  style?: CSSProperties
  id?: string
  lang?: string
}

export function Rise({
  children,
  className,
  as: Tag = 'div',
  distance = 40,
  delay = 0,
  duration = DUR.reveal,
  start = 'top 88%',
  style,
  id,
  lang,
}: RiseProps) {
  const allowed = useMotionAllowed()
  const ref = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (!allowed || !ref.current) return
      gsap.fromTo(
        ref.current,
        { y: distance, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration,
          delay,
          ease: EASE.outExpo,
          scrollTrigger: { trigger: ref.current, start, once: true },
        },
      )
    },
    { scope: ref, revertOnUpdate: true, dependencies: [allowed, distance, delay, duration, start] },
  )

  /* createElement rather than JSX, because an arbitrary ElementType cannot
     carry a typed ref through JSX without a cast at every call site. */
  return createElement(Tag, { ref, className, style, id, lang }, children)
}

/* --- Cascade --------------------------------------------------------------
   The same reveal across a run of siblings, so a list arrives as one gesture
   rather than as a set of unrelated ones. */

export interface CascadeProps {
  children: ReactNode
  className?: string
  as?: ElementType
  /** Seconds between siblings. */
  stagger?: number
  distance?: number
  duration?: number
  start?: string
  /** Which descendants to cascade. Defaults to every direct child. */
  selector?: string
  style?: CSSProperties
  id?: string
}

export function Cascade({
  children,
  className,
  as: Tag = 'div',
  stagger = 0.09,
  distance = 44,
  duration = DUR.reveal,
  start = 'top 86%',
  selector = '> *',
  style,
  id,
}: CascadeProps) {
  const allowed = useMotionAllowed()
  const ref = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (!allowed || !ref.current) return
      const targets = ref.current.querySelectorAll(selector.startsWith('>') ? `:scope ${selector}` : selector)
      if (targets.length === 0) return

      gsap.fromTo(
        targets,
        { y: distance, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration,
          ease: EASE.outExpo,
          stagger,
          scrollTrigger: { trigger: ref.current, start, once: true },
        },
      )
    },
    {
      scope: ref,
      revertOnUpdate: true,
      dependencies: [allowed, selector, stagger, distance, duration, start],
    },
  )

  return createElement(Tag, { ref, className, style, id }, children)
}

/* --- Wipe -----------------------------------------------------------------
   A plate uncovered from its lower edge while the media counter-scales, so
   the frame appears to open rather than slide. Wraps an InkPlate. */

export interface WipeProps {
  children: ReactNode
  className?: string
  duration?: number
  scale?: number
  start?: string
  style?: CSSProperties
}

export function Wipe({
  children,
  className,
  duration = DUR.slow,
  scale = 1.16,
  start = 'top 80%',
  style,
}: WipeProps) {
  const allowed = useMotionAllowed()
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const host = ref.current
      if (!allowed || !host) return

      const plate = host.querySelector<HTMLElement>('.plate') ?? host
      const media = host.querySelector<HTMLElement>('.plate__media')

      /* Built paused and released by the trigger. Pausing at build time is
         what holds the clip closed before the visitor arrives, and it is why
         no CSS class is needed to hide the plate first. */
      const timeline = revealPlate(plate, media ?? plate, { duration, scale }).pause()

      ScrollTrigger.create({
        trigger: host,
        start,
        once: true,
        onEnter: () => timeline.play(),
      })
    },
    { scope: ref, revertOnUpdate: true, dependencies: [allowed, duration, scale, start] },
  )

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  )
}

/* --- Parallax -------------------------------------------------------------
   Scrubbed translation. The only primitive here tied continuously to scroll
   rather than fired once, and the one that separates the ink plates from the
   type above them. */

export interface ParallaxProps {
  children: ReactNode
  className?: string
  /** Pixels of travel at the start of the sweep. */
  from?: number
  /** Pixels of travel at the end of the sweep. */
  to?: number
  /** Element the sweep is measured against. Defaults to this one. */
  trigger?: RefObject<HTMLElement | null>
  start?: string
  end?: string
  style?: CSSProperties
  id?: string
}

export function Parallax({
  children,
  className,
  from = -70,
  to = 70,
  trigger,
  start = 'top bottom',
  end = 'bottom top',
  style,
  id,
}: ParallaxProps) {
  const allowed = useMotionAllowed()
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const target = ref.current
      if (!allowed || !target) return
      const source = trigger?.current ?? target

      gsap.fromTo(
        target,
        { y: from },
        {
          y: to,
          ease: 'none',
          scrollTrigger: {
            trigger: source,
            start,
            end,
            /* A touch of lag. With Lenis smoothing the scroll, a hard scrub
               reads as the element being bolted to the viewport. */
            scrub: 0.7,
          },
        },
      )
    },
    {
      scope: ref,
      revertOnUpdate: true,
      dependencies: [allowed, from, to, start, end, trigger],
    },
  )

  return (
    <div ref={ref} className={className} style={style} id={id}>
      {children}
    </div>
  )
}

/* --- SplitLines -----------------------------------------------------------
   Display type that arrives one line at a time from behind a mask.

   SplitText measures the real line boxes, so this is correct at any width
   without a hand-authored break. `autoSplit` re-measures when the mincho web
   font lands and on resize, which matters here because Shippori Mincho is
   loaded from Google Fonts and the hero display type reflows substantially
   when it arrives. Each re-split reverts the previous pass first, so a resize
   can never stack two timelines on the same lines.

   SplitText's default `aria: "auto"` hides the fragments from assistive tech
   and puts the original string on the element as its accessible name, so the
   split never becomes the content.
   ----------------------------------------------------------------------- */

export interface SplitLinesProps {
  children: ReactNode
  className?: string
  as?: ElementType
  /** Seconds between lines. Slow, because the type is large. */
  stagger?: number
  duration?: number
  delay?: number
  start?: string
  /** Play on mount rather than on scroll, for above-the-fold type. */
  immediate?: boolean
  id?: string
  tabIndex?: number
  lang?: string
  style?: CSSProperties
}

export function SplitLines({
  children,
  className,
  as: Tag = 'h2',
  stagger = 0.11,
  duration = DUR.slow,
  delay = 0,
  start = 'top 84%',
  immediate = false,
  id,
  tabIndex,
  lang,
  style,
}: SplitLinesProps) {
  const allowed = useMotionAllowed()
  const ref = useRef<HTMLElement>(null)

  /* Managed outside useGSAP on purpose. SplitText is not an animation, so a
     context revert would leave the fragments in the DOM, and a second pass
     would split already-split markup. */
  useLayoutEffect(() => {
    const node = ref.current
    if (!allowed || !node) return

    const passes: gsap.Context[] = []

    const split = new SplitText(node, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit: (instance: SplitText) => {
        passes.pop()?.revert()

        const pass = gsap.context(() => {
          if (instance.lines.length === 0) return
          gsap.fromTo(
            instance.lines,
            { yPercent: 118, opacity: 0 },
            {
              yPercent: 0,
              opacity: 1,
              duration,
              delay,
              ease: EASE.outExpo,
              stagger,
              scrollTrigger: immediate ? undefined : { trigger: node, start, once: true },
            },
          )
        }, node)

        passes.push(pass)
      },
    })

    return () => {
      while (passes.length > 0) passes.pop()?.revert()
      split.revert()
    }
  }, [allowed, stagger, duration, delay, start, immediate])

  return createElement(
    Tag,
    { ref, className, id, tabIndex, lang, style },
    children,
  )
}
