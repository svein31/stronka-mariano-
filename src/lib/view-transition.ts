export interface RunningTransition {skipTransition:()=>void;finished:Promise<void>}
/** Geometry is read once per boundary, never during animation frames. */
export function transitionView(update:()=>void,productSlug?:string):RunningTransition|null {
 if(!document.startViewTransition)return null
 const selector=productSlug?'[data-product="'+productSlug+'"] img':'.gallery-main img'
 const source=document.querySelector<HTMLElement>(selector),before=source?.getBoundingClientRect()
 if(source)source.style.viewTransitionName='hero-image'
 let target:HTMLElement|null=null,after:DOMRect|undefined,animation:Animation|undefined
 const transition=document.startViewTransition(()=>{
  update()
  target=document.querySelector<HTMLElement>(productSlug?'.gallery-main img':selector)
  if(target){target.style.viewTransitionName='hero-image';after=target.getBoundingClientRect()}
 })
 void transition.ready.then(()=>{
  if(!before||!after||!before.width||!before.height||!after.width||!after.height)return
  animation=document.documentElement.animate([
   {transform:`translate(${before.x}px,${before.y}px) scale(${before.width/after.width},${before.height/after.height})`},
   {transform:`translate(${after.x}px,${after.y}px) scale(1,1)`},
  ],{pseudoElement:'::view-transition-group(hero-image)',duration:320,easing:'cubic-bezier(.2,0,0,1)',fill:'both'})
 }).catch(()=>{})
 void transition.finished.finally(()=>{animation?.cancel();source?.style.removeProperty('view-transition-name');target?.style.removeProperty('view-transition-name')}).catch(()=>{})
 return transition
}
