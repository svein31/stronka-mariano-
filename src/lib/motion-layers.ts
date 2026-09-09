import {useEffect,useRef,useSyncExternalStore,type RefObject} from 'react'
const subscribe=(callback:()=>void)=>{const q=matchMedia('(max-width: 800px), (pointer: coarse)');q.addEventListener('change',callback);return()=>q.removeEventListener('change',callback)}
export const useMobile=()=>useSyncExternalStore(subscribe,()=>matchMedia('(max-width: 800px), (pointer: coarse)').matches,()=>false)

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
