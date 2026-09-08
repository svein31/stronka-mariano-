import {useEffect,useRef,useState,type FormEvent,type ReactNode} from 'react'
import {ApiError} from '../lib/api'
export function LoadingState({children='Wczytujemy dane…'}:{children?:ReactNode}){return <div className="service-state" role="status" aria-live="polite"><span className="loading-line" aria-hidden="true"/>{children}</div>}
export function ErrorState({error,retry}:{error:string;retry?:()=>void}){return <div className="service-state service-error" role="alert"><strong>Nie udało się dokończyć.</strong><p>{error}</p>{retry&&<button type="button" onClick={retry}>Spróbuj ponownie</button>}</div>}
export function EmptyState({title,children}:{title:string;children:ReactNode}){return <div className="service-state"><h3>{title}</h3><p>{children}</p></div>}
export function useDraft(key:string){
 const [value,setValue]=useState<Record<string,string>>(()=>{try{const saved=JSON.parse(sessionStorage.getItem(key)||'null');return saved&&Date.now()-saved.at<86400000?saved.value:{}}catch{return {}}})
 const update=(name:string,text:string)=>setValue(old=>{const next={...old,[name]:text};try{sessionStorage.setItem(key,JSON.stringify({at:Date.now(),value:next}))}catch{}return next})
 const clear=()=>{try{sessionStorage.removeItem(key)}catch{}setValue({})}
 return {value,update,clear}
}
export function ServiceForm({children,onSend,submit='Zapisz',onSaved,resetOnSuccess=false}:{children:ReactNode;onSend:(form:FormData)=>Promise<unknown>;submit?:string;onSaved?:()=>void;resetOnSuccess?:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false),[fields,setFields]=useState<Record<string,string>>({}),[retryAt,setRetryAt]=useState(0)
 const [clock,setClock]=useState(Date.now()),ref=useRef<HTMLFormElement>(null)
 useEffect(()=>{if(!retryAt)return;const t=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(t)},[retryAt])
 async function send(e:FormEvent){e.preventDefault();if(busy||retryAt>Date.now())return;setBusy(true);setError('');setSaved(false);setFields({});try{await onSend(new FormData(ref.current!));setSaved(true);if(resetOnSuccess)ref.current?.reset();onSaved?.()}catch(e){setError((e as Error).message);if(e instanceof ApiError){setFields(e.fields);if(e.status===429)setRetryAt(Date.now()+e.retryAfter*1000)}}finally{setBusy(false)}}
 const remaining=Math.max(0,Math.ceil((retryAt-clock)/1000))
 return <form ref={ref} onSubmit={send} aria-busy={busy}><fieldset disabled={busy||remaining>0}>{children}<button className="btn" type="submit">{busy?'Zapisujemy…':remaining?'Ponów za '+remaining+' s':submit}</button></fieldset>{error&&<ErrorState error={error}/>} {!!Object.keys(fields).length&&<ul>{Object.entries(fields).map(([k,v])=><li key={k}>{k}: {v}</li>)}</ul>}<p role="status">{saved?'Zapisano.':busy?'Trwa zapisywanie — nie zamykaj tej karty.':''}</p></form>
}
