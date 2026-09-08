import {useEffect,useState,type FormEvent} from 'react'
import {Link,useParams} from 'react-router-dom'
import {post} from '../lib/api'
import {useProducts} from '../state/store'
import {PageHeading,NotFound} from './Pages'
import {OrderCenter} from './OrderCenter'
import {useDraft,ErrorState} from '../components/ServiceStates'
export const stageNames:Record<string,string>={received:'Do uzgodnienia',confirmed:'Przyjęte',cutting:'Krojenie',sewing:'Szycie',printing:'Nadruk',ready:'Gotowe',shipped:'Wysłane',cancelled:'Anulowane'}
export function ProtectedPhoto({path,token}:{path:string;token?:string}){
 const [src,setSrc]=useState(''),[error,setError]=useState(false),[attempt,setAttempt]=useState(0)
 useEffect(()=>{let active=true,url='';setError(false);setSrc('');fetch(path,{headers:token?{Authorization:'Bearer '+token}:{},signal:AbortSignal.timeout(15000)}).then(async r=>{if(!r.ok)throw Error();url=URL.createObjectURL(await r.blob());if(active)setSrc(url);else URL.revokeObjectURL(url)}).catch(()=>{if(active)setError(true)});return()=>{active=false;if(url)URL.revokeObjectURL(url)}},[path,token,attempt])
 return src?<img className="progress-photo" src={src} alt="Zdjęcie wykonania Twojej pary, dodane przez pracownię."/>:error?<ErrorState error="Zdjęcie jest chwilowo niedostępne." retry={()=>setAttempt(n=>n+1)}/>:<p role="status">Wczytujemy zdjęcie…</p>
}
export function Tracking(){return <OrderCenter/>}
export function Personalization(){
 const {slug}=useParams(),product=useProducts().find(p=>p.slug===slug),measurements=useDraft('workshop.measurements')
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[id,setId]=useState('')
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setError('');try{const result=await post<{id:string}>('/api/personalizations',{slug,name:f.get('name'),email:f.get('email'),material:f.get('material'),print:f.get('print'),inseam:Number(f.get('inseam')),waist:Number(f.get('waist')),hips:Number(f.get('hips')),notes:f.get('notes'),acknowledged:f.get('acknowledged')==='on'});setId(result.id)}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 if(!product)return <NotFound/>
 return <><PageHeading eyebrow={'Personalizacja / '+product.name} title="Para według Twoich wymiarów." text="Prześlij pomysł. Pracownia potwierdzi możliwości, cenę i termin przed przyjęciem do wykonania."/><section className="shell section solid-stage tool-reading">{id?<div role="status"><h2>Pomysł zapisany.</h2><p>Numer zapytania: {id}. Czekaj na indywidualną wycenę. Nie pobrano płatności.</p></div>:<form onSubmit={submit}>{[['name','Imię i nazwisko','text'],['email','E-mail','email']].map(([name,label,type])=><label className="field" key={name}>{label}<input name={name} type={type} required maxLength={name==='email'?254:100}/></label>)}<div className="measure-grid">{[['material','Materiał',product.customMaterials||[product.material]],['print','Nadruk',product.customPrints||[product.printStyle]]].map(([name,label,values])=><label className="field" key={String(name)}>{label}<select name={String(name)}>{(values as string[]).map(v=><option key={v}>{v}</option>)}</select></label>)}</div><p>Podaj obwody ciała oraz docelową długość wewnętrzną nogawki w cm. <Link to="/size-guide">Instrukcja mierzenia krok po kroku</Link></p><div className="measure-grid">{[['waist','Pas'],['hips','Biodra'],['inseam','Nogawka']].map(([name,label])=><label className="field" key={name}>{label}<input name={name} type="number" min="20" max="250" step="0.5" defaultValue={measurements.value[name]||''} required/></label>)}</div><label className="field">Dodatkowe wymiary i pomysł na dekorację<textarea name="notes" maxLength={1500}/></label><label className="check"><input type="checkbox" name="acknowledged" required/><span>Znam <Link to="/privacy">informację o prywatności</Link>. To zapytanie o wycenę, nie potwierdzone zamówienie.</span></label>{error&&<p role="alert">{error}</p>}<button className="btn" disabled={busy||product.available===false}>{busy?'Zapisujemy…':'Poproś o wycenę'}</button></form>}</section></>
}
export function NewsletterAction(){
 const [action,setAction]=useState<{purpose:string;token:string}|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 useEffect(()=>{const match=window.location.hash.slice(1).match(/^(confirm|unsubscribe)\.([a-f0-9]{64})$/);if(match){setAction({purpose:match[1],token:match[2]});window.history.replaceState(null,'',window.location.pathname)}},[])
 async function submit(){if(!action)return;setBusy(true);try{await post('/api/newsletter/action',action);setMessage(action.purpose==='confirm'?'Zapis potwierdzony.':'Adres został wypisany.');setAction(null)}catch(e){setMessage((e as Error).message)}finally{setBusy(false)}}
 return <><PageHeading eyebrow="Wiadomości z pracowni" title="Twój wybór wiadomości."/><section className="shell section solid-stage tool-reading">{action?<button className="btn" disabled={busy} onClick={submit}>{action.purpose==='confirm'?'Potwierdzam zapis':'Wypisz mnie'}</button>:!message?<p>Otwórz link z wiadomości e-mail.</p>:null}<p role="status">{message}</p></section></>
}
