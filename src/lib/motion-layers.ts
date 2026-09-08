import {useEffect,useLayoutEffect,useRef,useSyncExternalStore,type RefObject} from 'react'
import gsap from 'gsap'
import {Flip} from 'gsap/Flip'
import {useCapabilities} from './capabilities'
gsap.registerPlugin(Flip)
const subscribe=(callback:()=>void)=>{const q=matchMedia('(max-width: 800px), (pointer: coarse)');q.addEventListener('change',callback);return()=>q.removeEventListener('change',callback)}
export const useMobile=()=>useSyncExternalStore(subscribe,()=>matchMedia('(max-width: 800px), (pointer: coarse)').matches,()=>false)

export function useScrollAwareHeader(ref:RefObject<HTMLElement|null>,blocked:boolean){
 const mobile=useMobile(),{reducedMotion}=useCapabilities()
 useEffect(()=>{const element=ref.current;if(!element)return;element.classList.remove('nav--scroll-hidden');if(!mobile||reducedMotion||blocked)return;let previous=window.scrollY,frame=0
  const update=()=>{frame=0;const current=Math.max(0,window.scrollY),delta=current-previous;if(Math.abs(delta)<8&&current>100)return;const hidden=current>100&&delta>0&&!element.contains(document.activeElement);element.classList.toggle('nav--scroll-hidden',hidden);previous=current}
  const onScroll=()=>{if(!frame)frame=requestAnimationFrame(update)}
  const onFocus=()=>element.classList.remove('nav--scroll-hidden')
  window.addEventListener('scroll',onScroll,{passive:true});element.addEventListener('focusin',onFocus)
  return()=>{window.removeEventListener('scroll',onScroll);element.removeEventListener('focusin',onFocus);cancelAnimationFrame(frame);element.classList.remove('nav--scroll-hidden')}
 },[mobile,reducedMotion,blocked,ref])
}
export function useSheetDrag(ref:RefObject<HTMLDivElement|null>,open:boolean,mobile:boolean,dismiss:()=>void){
 const dismissRef=useRef(dismiss);dismissRef.current=dismiss
 useEffect(()=>{const sheet=ref.current;if(!sheet||!open||!mobile)return;const handle=sheet.querySelector<HTMLElement>('.sheet-handle');if(!handle)return;let start=0,distance=0,active=false,pointer=0
  const reset=()=>{active=false;sheet.classList.remove('is-dragging');sheet.style.removeProperty('transform')}
  const down=(e:PointerEvent)=>{if(!e.isPrimary||e.button!==0)return;active=true;pointer=e.pointerId;start=e.clientY;distance=0;handle.setPointerCapture(pointer);sheet.classList.add('is-dragging')}
  const move=(e:PointerEvent)=>{if(!active||e.pointerId!==pointer)return;distance=Math.max(0,e.clientY-start);sheet.style.transform='translateY('+distance+'px)'}
  const up=()=>{if(!active)return;const close=distance>100;reset();if(close)dismissRef.current()}
  const click=(e:MouseEvent)=>{if(distance>5){e.preventDefault();e.stopPropagation();distance=0}}
  handle.addEventListener('pointerdown',down);handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);handle.addEventListener('pointercancel',reset)
  handle.addEventListener('click',click,true)
  return()=>{handle.removeEventListener('pointerdown',down);handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);handle.removeEventListener('pointercancel',reset);handle.removeEventListener('click',click,true);reset()}
 },[ref,open,mobile])
}
export function useFlipGrid(key:string){
 const ref=useRef<HTMLDivElement>(null),snapshot=useRef<ReturnType<typeof Flip.getState>|null>(null),animation=useRef<gsap.core.Timeline|null>(null)
 const {reducedMotion}=useCapabilities(),mobile=useMobile()
 const capture=()=>{if(reducedMotion||mobile||!ref.current)return;animation.current?.kill();snapshot.current=Flip.getState(ref.current.querySelectorAll('.shop-cell'))}
 useLayoutEffect(()=>{if(!snapshot.current||mobile||reducedMotion)return;animation.current=Flip.from(snapshot.current,{duration:.5,ease:'power2.inOut',scale:true,prune:true});snapshot.current=null;return()=>{animation.current?.kill()}},[key,mobile,reducedMotion])
 return {ref,capture}
}
export function useWAAPI(ref:RefObject<HTMLElement|null>,value:unknown){
 const {reducedMotion}=useCapabilities(),first=useRef(true)
 useEffect(()=>{if(first.current){first.current=false;return}if(reducedMotion||!ref.current?.animate)return;const animation=ref.current.animate([{transform:'scale(1)',opacity:1},{transform:'scale(1.12)',opacity:.8},{transform:'scale(1)',opacity:1}],{duration:220,easing:'cubic-bezier(.2,0,0,1)'});return()=>animation.cancel()},[value,reducedMotion,ref])
}
