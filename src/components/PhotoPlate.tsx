import {useEffect,useState} from 'react'
import {candidatesFor,knownPath,markResolved,mediaSlots} from '../lib/media'
import {useCapabilities} from '../lib/capabilities'
export function PhotoPlate({slot,alt,eager=false,detail=false,className=''}:{slot:string;alt:string;eager?:boolean;detail?:boolean;className?:string}) {
 const [candidate,setCandidate]=useState(0)
 const [loaded,setLoaded]=useState(false)
 const {requestRefresh}=useCapabilities()
 useEffect(()=>{setCandidate(0);setLoaded(false)},[slot])
 const paths=candidatesFor(slot),src=knownPath(slot)||paths[candidate]
 const responsive=src?.endsWith('.webp')&&mediaSlots.includes(slot)
 return <div className={'plate '+className} data-detail={detail} data-slot-state={loaded?'loaded':'fallback'} style={{aspectRatio:slot==='process'?'3 / 2':'3 / 4'}}>
   {!loaded&&<div className="plate__fallback" role="img" aria-label={alt}><span className="eyebrow">Pracownia / {slot}</span><p>{alt}</p><span className="small">Fotografia chwilowo niedostępna</span></div>}
   {src&&<img className="plate__media" src={src} srcSet={responsive?'/media/'+slot+'-480.webp 480w, /media/'+slot+'-960.webp 960w, /media/'+slot+'.webp '+(slot==='process'?'1440w':'1086w'):undefined} sizes={slot==='process'?'100vw':'(max-width: 767px) 100vw, 55vw'} width={slot==='process'?1440:1086} height={slot==='process'?960:1448} alt={alt} aria-hidden={!loaded} style={{opacity:loaded?1:0}} loading={eager?'eager':'lazy'} fetchPriority={eager?'high':'auto'} decoding="async" onLoad={()=>{markResolved(slot,src);setLoaded(true);requestRefresh()}} onError={()=>{markResolved(slot,null);setLoaded(false);setCandidate(n=>Math.min(n+1,paths.length))}}/>}
 </div>
}
