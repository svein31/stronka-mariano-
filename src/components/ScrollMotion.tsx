

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
import { useMotionAllowed, useVisualPolicy } from '../lib/capabilities'
import { DUR, EASE, revealPlate } from '../lib/motion'

export interface RiseProps {
  children: ReactNode
  className?: string

  as?: ElementType

  distance?: number
  delay?: number
  duration?: number

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

  return createElement(Tag, { ref, className, style, id, lang }, children)
}

export interface CascadeProps {
  children: ReactNode
  className?: string
  as?: ElementType

  stagger?: number
  distance?: number
  duration?: number
  start?: string

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

export interface ParallaxProps {
  children: ReactNode
  className?: string

  from?: number

  to?: number

  trigger?: RefObject<HTMLElement | null>
  start?: string
  end?: string
  style?: CSSProperties
  id?: string
}

export function Parallax({
  children,
  className,
  from = -24,
  to = 24,
  trigger,
  start = 'top bottom',
  end = 'bottom top',
  style,
  id,
}: ParallaxProps) {
  const allowed = useMotionAllowed()
  const policy=useVisualPolicy()
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const target = ref.current
      if (!allowed || !policy.parallax || !target) return
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

            scrub: 0.7,
          },
        },
      )
    },
    {
      scope: ref,
      revertOnUpdate: true,
      dependencies: [allowed, policy.parallax, from, to, start, end, trigger],
    },
  )

  return (
    <div ref={ref} className={className} style={style} id={id}>
      {children}
    </div>
  )
}

export interface SplitLinesProps {
  children: ReactNode
  className?: string
  as?: ElementType

  stagger?: number
  duration?: number
  delay?: number
  start?: string

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
