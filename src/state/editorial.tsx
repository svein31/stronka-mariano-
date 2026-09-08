import {createContext,useContext,useEffect,useState,type ReactNode} from 'react'
import seed from '../../shared/editorial.json'
import {api} from '../lib/api'
export interface EditorialSection {id:string;type:'text'|'image'|'products'|'drops'|'cloth';title:string;text?:string;image?:string;mobileImage?:string;alt?:string;ctaLabel?:string;ctaHref?:string;theme?:'dark'|'light';enabled:boolean;limit?:number;productSlugs?:string[]}
export interface EditorialDocument {id?:string;kind:'page'|'drop';slug:string;title:string;eyebrow?:string;description?:string;image?:string;mobileImage?:string;video?:string;alt?:string;ctaLabel?:string;ctaHref?:string;seoTitle?:string;seoDescription?:string;theme?:'dark'|'light';layout?:'split'|'grid'|'wide';height?:'full'|'large'|'compact';align?:'left'|'center'|'right';overlay?:number;focalX?:number;focalY?:number;position?:number;productSlugs?:string[];launchAt?:string;endsAt?:string;badge?:string;enabled?:boolean;showHome?:boolean;showDate?:boolean;showCountdown?:boolean;showProducts?:boolean;showWaitlist?:boolean;showArchive?:boolean;phase?:'upcoming'|'live'|'ended';sections:EditorialSection[]}
const defaults=seed as EditorialDocument[]
const Context=createContext({documents:defaults,error:'',loading:false,refresh:()=>{}})
export function EditorialProvider({children}:{children:ReactNode}){
 const [documents,setDocuments]=useState(defaults),[error,setError]=useState(''),[loading,setLoading]=useState(true),[version,setVersion]=useState(0)
 useEffect(()=>{let active=true;const load=()=>{if(document.visibilityState==='hidden')return;api<{documents:EditorialDocument[]}>('/api/editorial').then(r=>{if(active){setDocuments(r.documents);setError('')}}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)})};load();const timer=window.setInterval(load,30000);window.addEventListener('focus',load);return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',load)}},[version])
 return <Context.Provider value={{documents,error,loading,refresh:()=>setVersion(v=>v+1)}}>{children}</Context.Provider>
}
export const useEditorial=()=>useContext(Context)
