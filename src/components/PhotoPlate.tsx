import {useState} from 'react'
import {candidatesFor,markResolved,mediaSlots} from '../lib/media'

type Props={slot:string;src?:string;alt:string;eager?:boolean;detail?:boolean;className?:string;retryable?:boolean}
export function PhotoPlate(props:Props) {
  // A changed source owns fresh state; no late effect can hide a cached image.
  return <Photo key={props.slot+'|'+(props.src||'')} {...props}/>
}
function Photo({slot,src:imageSrc,alt,eager=false,detail=false,className='',retryable=false}:Props) {
  const [candidate,setCandidate]=useState(0),[loaded,setLoaded]=useState(false)
  const [originalOnly,setOriginalOnly]=useState(false),[attempt,setAttempt]=useState(0)
  const paths=imageSrc?[imageSrc]:candidatesFor(slot),src=paths[candidate]
  const responsive=!originalOnly&&!imageSrc&&candidate===0&&mediaSlots.includes(slot)
  const ready=()=>{if(!imageSrc&&src)markResolved(slot,src);setLoaded(true)}
  const retry=()=>{setCandidate(0);setOriginalOnly(true);setLoaded(false);setAttempt(n=>n+1)}
  return <div className={'plate '+className} data-detail={detail} data-slot-state={loaded?'loaded':src?'loading':'fallback'} style={{aspectRatio:slot==='process'?'3 / 2':'3 / 4'}}>
    {!loaded&&<div className="plate__fallback" role="img" aria-label={alt}><span className="eyebrow">MARIANO / {slot}</span><p>{alt}</p><span className="small">{src?'Wczytujemy fotografię…':'Fotografia chwilowo niedostępna'}</span></div>}
    {src&&<img key={src+'|'+originalOnly+'|'+attempt} ref={image=>{if(image?.complete&&image.naturalWidth>0)ready()}} className="plate__media" src={src} srcSet={responsive?'/media/'+slot+'-480.webp 480w, /media/'+slot+'-960.webp 960w, /media/'+slot+'.webp '+(slot==='process'?'1440w':'1086w'):undefined} sizes={slot==='process'?'100vw':'(max-width: 767px) 100vw, 55vw'} width={slot==='process'?1440:1086} height={slot==='process'?960:1448} alt={alt} loading={eager?'eager':'lazy'} fetchPriority={eager?'high':'auto'} decoding="async" onLoad={ready} onError={()=>{setLoaded(false);if(responsive)setOriginalOnly(true);else setCandidate(n=>Math.min(n+1,paths.length))}}/>}
    {!src&&retryable&&<button type="button" className="photo-retry" onClick={retry}>Wczytaj ponownie</button>}
  </div>
}
