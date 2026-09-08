import {lazy,Suspense,useEffect,useRef,useState} from 'react'
import {useMotionBudget} from '../lib/capabilities'
import {EnhancementBoundary} from './EnhancementBoundary'
import type {Cloth} from '../data/collection'
const HangingCloth=lazy(()=>import('./three/PrintedCloth').then(m=>({default:m.PrintedCloth})))
const Swatch=lazy(()=>import('./three/ClothSwatch').then(m=>({default:m.ClothSwatch})))
export function ClothStudy({cloth,tint}:{cloth?:Cloth;tint?:string}) {
 const budget=useMotionBudget(),ref=useRef<HTMLDivElement>(null),[near,setNear]=useState(false)
 useEffect(()=>{if(!ref.current||!budget.enabled)return;if(!('IntersectionObserver' in window)){setNear(true);return;}const observer=new IntersectionObserver(([entry])=>setNear(entry.isIntersecting),{rootMargin:'240px'});observer.observe(ref.current);return()=>observer.disconnect()},[budget.enabled])
 return <div ref={ref} className="cloth-study">{budget.enabled&&near&&<EnhancementBoundary><Suspense fallback={null}>{cloth&&tint?<Swatch cloth={cloth} tint={tint} label="Studium drukowanej tkaniny"/>:<HangingCloth/>}</Suspense></EnhancementBoundary>}</div>
}
