import {MotionConfig, motion, useMotionValue, useSpring} from 'motion/react'
import {useEffect, type ComponentProps, type ReactNode} from 'react'
import {Link, useLocation} from 'react-router-dom'
import {useCapabilities, useVisualPolicy} from '../lib/capabilities'

export function InteractionProvider({children}: {children:ReactNode}) {
  const {reducedMotion} = useCapabilities()
  return <MotionConfig reducedMotion={reducedMotion ? 'always' : 'user'} transition={{duration:.24,ease:[.22,1,.36,1]}}>{children}</MotionConfig>
}

const MotionLink = motion.create(Link)

export function MagneticLink({children, ...props}: ComponentProps<typeof MotionLink>) {
  const policy = useVisualPolicy()
  const location = useLocation()
  const transactional = ['/cart','/checkout','/order-confirmation'].some(path => location.pathname.startsWith(path))
  const enabled = policy.magnetic && !transactional
  const x = useSpring(0,{stiffness:320,damping:23})
  const y = useSpring(0,{stiffness:320,damping:23})
  useEffect(() => {if(!enabled) {x.jump(0);y.jump(0)}},[enabled,x,y])
  return <MotionLink {...props} className={'btn '+(props.className||'')} style={{...props.style,x,y}}
    onPointerMove={event => {
      props.onPointerMove?.(event)
      if(!enabled || event.pointerType !== 'mouse') return
      const rect=event.currentTarget.getBoundingClientRect()
      x.set(((event.clientX-rect.left)/rect.width-.5)*10)
      y.set(((event.clientY-rect.top)/rect.height-.5)*10)
    }}
    onPointerLeave={event => {props.onPointerLeave?.(event);x.set(0);y.set(0)}}
    whileHover={enabled?{scale:1.015}:undefined}
    whileTap={enabled?{scale:.98}:undefined}
    transition={{type:'spring',stiffness:320,damping:23}}
  >{children}</MotionLink>
}

export function GlassGlint() {
  const {glass} = useVisualPolicy()
  const x = useMotionValue(0)
  const eased = useSpring(x,{stiffness:80,damping:30})
  useEffect(() => {
    if(!glass) {x.set(0);return}
    const move=(event:PointerEvent)=>x.set((event.clientX/window.innerWidth-.5)*220)
    window.addEventListener('pointermove',move,{passive:true})
    return ()=>window.removeEventListener('pointermove',move)
  },[glass,x])
  return <motion.span className="glass-glint" aria-hidden="true" style={{x:eased,opacity:glass?.22:0}}/>
}
