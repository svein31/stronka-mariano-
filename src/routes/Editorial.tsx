import {useEffect,useRef,useState,type CSSProperties,type FormEvent} from 'react'
import {Link,useParams} from 'react-router-dom'
import {useEditorial,type EditorialDocument,type EditorialSection} from '../state/editorial'
import {useProducts} from '../state/store'
import {useCapabilities,useVisualPolicy} from '../lib/capabilities'
import {useGSAP} from '@gsap/react'
import gsap from 'gsap'
import {useDocumentTitle,SiteLink} from '../components/Transition'
import {ProductCard,PageHeading,NotFound} from './Pages'
import {CraftChapter} from '../components/Cinematic'
import {Rise} from '../components/ScrollMotion'
import {post} from '../lib/api'
import brand from '../../shared/brand.json'

export function EditorialImage({image,mobileImage,alt,eager=false}:{image?:string;mobileImage?:string;alt?:string;eager?:boolean}){
 const [failed,setFailed]=useState(false)
 useEffect(()=>setFailed(false),[image,mobileImage])
 if(!image||failed)return <div className="editorial-image-fallback" role="img" aria-label={alt||'Zdjęcie niedostępne'}>MARIANO</div>
 return <picture>{mobileImage&&<source media="(max-width: 640px)" srcSet={mobileImage}/>}<img src={image} alt={alt||''} width="1086" height="1448" loading={eager?'eager':'lazy'} fetchPriority={eager?'high':'auto'} decoding="async" onError={()=>setFailed(true)}/></picture>
}
export function EditorialHero({document:d,preview=false}:{document:EditorialDocument;preview?:boolean}){
 const {reducedMotion}=useCapabilities(),ref=useRef<HTMLVideoElement>(null)
 const hero=useRef<HTMLElement>(null),policy=useVisualPolicy()
 useGSAP(()=>{if(preview||!policy.parallax||!hero.current)return;const media=gsap.matchMedia();media.add('(min-width: 64rem) and (min-height: 700px)',()=>{if(!policy.pin)return;gsap.timeline({scrollTrigger:{trigger:hero.current,start:'top top',end:'+=65%',pin:true,scrub:.65,invalidateOnRefresh:true}}).to('.editorial-hero__image',{scale:1.1,yPercent:4,ease:'none'},0).to('.editorial-hero__copy',{y:-32,ease:'none'},0)});media.add('(max-width: 63.999rem), (max-height: 699px)',()=>{gsap.fromTo('.editorial-hero__image',{scale:1.08,yPercent:-2},{scale:1.14,yPercent:4,ease:'none',scrollTrigger:{trigger:hero.current,start:'top top',end:'bottom top',scrub:.5}})});return()=>media.revert()},{scope:hero,dependencies:[preview,policy.parallax,policy.pin,d.id,d.image],revertOnUpdate:true})
 useEffect(()=>{const video=ref.current;if(!video||reducedMotion||preview||!('IntersectionObserver' in window))return;const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting&&globalThis.document.visibilityState==='visible')void video.play().catch(()=>{});else video.pause()});observer.observe(video);const pause=()=>{if(globalThis.document.hidden)video.pause()};globalThis.document.addEventListener('visibilitychange',pause);return()=>{observer.disconnect();video.pause();globalThis.document.removeEventListener('visibilitychange',pause)}},[d.video,reducedMotion,preview])
 return <header ref={hero} className="editorial-hero" data-theme={d.theme||'dark'} data-height={d.height||'large'} data-align={d.align||'left'} style={{'--hero-overlay':(d.overlay??35)/100,'--focal-x':(d.focalX??50)+'%','--focal-y':(d.focalY??50)+'%'} as CSSProperties}>
 <div className="editorial-hero__image"><EditorialImage image={d.image} mobileImage={d.mobileImage} alt={d.alt} eager/>{d.video&&!reducedMotion&&!preview&&<video ref={ref} muted playsInline controls preload="metadata" poster={d.image} src={d.video} aria-label="Film kolekcji"/>}</div>
 <div className="editorial-hero__copy"><p className="eyebrow">{d.eyebrow||'MARIANO / COLLECTION'}</p><h1 id={preview?undefined:'route-title'} tabIndex={-1}>{d.title}</h1>{d.description&&<p>{d.description}</p>}{d.ctaHref&&d.ctaLabel&&<SiteLink className="editorial-link" to={d.ctaHref}>{d.ctaLabel}</SiteLink>}</div></header>
}
const phase=(d:EditorialDocument,now:number)=>d.endsAt&&Date.parse(d.endsAt)<=now?'ended':d.launchAt&&Date.parse(d.launchAt)>now?'upcoming':'live'
function Countdown({date}:{date:string}){
 const [now,setNow]=useState(Date.now())
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[])
 const total=Math.max(0,Math.floor((Date.parse(date)-now)/1000))
 return <span className="drop-countdown" aria-label="Czas do premiery">{Math.floor(total/86400)}d {String(Math.floor(total/3600)%24).padStart(2,'0')}h {String(Math.floor(total/60)%60).padStart(2,'0')}m <span aria-hidden="true">{String(total%60).padStart(2,'0')}s</span></span>
}
function DropMeta({document:d}:{document:EditorialDocument}){
 const status=phase(d,Date.now())
 return <div className="drop-meta"><span>{d.badge||({upcoming:'Wkrótce',live:'Kolekcja',ended:'Archiwum'}[status])}</span>{d.showDate&&d.launchAt&&<time dateTime={d.launchAt}>{new Intl.DateTimeFormat('pl-PL',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Warsaw'}).format(new Date(d.launchAt))} (PL)</time>}{d.showCountdown&&d.launchAt&&status==='upcoming'&&<Countdown date={d.launchAt}/>}</div>
}
export function DropGrid({home=false,archive=false,limit=12,layout='grid'}:{home?:boolean;archive?:boolean;limit?:number;layout?:string}){
 const {documents,error,loading,refresh}=useEditorial()
 const drops=documents.filter(d=>d.kind==='drop'&&(!home||d.showHome)&& (archive?phase(d,Date.now())==='ended'&&d.showArchive:phase(d,Date.now())!=='ended')).slice(0,limit)
 if(error&&!drops.length)return <div className="empty"><p role="alert">Nie udało się wczytać kolekcji.</p><button onClick={refresh}>Spróbuj ponownie</button></div>
 if(!drops.length)return <p className="editorial-empty" role="status">{loading?'Wczytujemy kolekcje…':archive?'Archiwum czeka na pierwszy rozdział.':'Nowa kolekcja jest w przygotowaniu.'}</p>
 return <div className="drop-grid" data-layout={layout}>{drops.map(d=><article className="drop-card" key={d.id}><SiteLink to={'/drops/'+d.slug}><EditorialImage image={d.image} mobileImage={d.mobileImage} alt={d.alt}/><div className="drop-card__copy"><DropMeta document={d}/><h3>{d.title}</h3><p>{d.description}</p><span>{d.ctaLabel||'Odkryj drop'}</span></div></SiteLink></article>)}</div>
}
export function EditorialSections({sections,preview=false}:{sections:EditorialSection[];preview?:boolean}){
 const products=useProducts()
 return <>{sections.filter(s=>s.enabled).map(s=>s.type==='cloth'?<CraftChapter key={s.id} title={s.title} description={s.text}/>:<section key={s.id} className={'editorial-section editorial-section--'+s.type} data-theme={s.theme||'light'}><div className="shell">{s.type==='image'?<div className="editorial-story"><EditorialImage image={s.image} mobileImage={s.mobileImage} alt={s.alt}/><Rise><h2>{s.title}</h2>{s.text&&<p>{s.text}</p>}{s.ctaHref&&<SiteLink className="editorial-link" to={s.ctaHref}>{s.ctaLabel||'Odkryj'}</SiteLink>}</Rise></div>:<><div className="editorial-section__heading"><h2>{s.title}</h2>{s.text&&<p>{s.text}</p>}{s.ctaHref&&<SiteLink to={s.ctaHref}>{s.ctaLabel||'Odkryj'}</SiteLink>}</div>{s.type==='products'&&<div className="editorial-products">{(s.productSlugs||[]).map(slug=>products.find(p=>p.slug===slug)).filter(p=>!!p).map(p=><ProductCard key={p.slug} product={p}/>)}</div>}{s.type==='drops'&&(preview?<p>W tym miejscu pojawią się publiczne dropy oznaczone „Na stronie głównej”.</p>:<DropGrid home limit={s.limit}/>)}</>}</div></section>)}</>
}
export function EditorialPage({page}:{page:string}){
 const d=useEditorial().documents.find(d=>d.kind==='page'&&d.slug===page)
 useDocumentTitle((d?.seoTitle||d?.title||'Mariano')+' — '+brand.name)
 useEffect(()=>{if(!d)return;const tag=document.querySelector('meta[name="description"]');const old=tag?.getAttribute('content');tag?.setAttribute('content',d.seoDescription||d.description||'');return()=>{if(old!==null&&old!==undefined)tag?.setAttribute('content',old)}},[d])
 return d?<><EditorialHero document={d}/><EditorialSections sections={d.sections}/></>:<NotFound/>
}
export function Collections({archive=false}:{archive?:boolean}){return <><PageHeading eyebrow="MARIANO / KOLEKCJE" title={archive?'Archiwum.':'Nowy rozdział.'} text={archive?'Poprzednie kolekcje.':'Autorskie projekty. Kolejne premiery.'}/><nav className="shell editorial-tabs"><Link to="/collections" aria-current={!archive?'page':undefined}>Kolekcje</Link><Link to="/archive" aria-current={archive?'page':undefined}>Archiwum</Link><Link to="/lookbook">Lookbook</Link></nav><section className="shell section"><DropGrid archive={archive}/></section></>}
export function DropPage(){
 const {slug}=useParams(),d=useEditorial().documents.find(d=>d.kind==='drop'&&d.slug===slug),products=useProducts()
 useDocumentTitle((d?.seoTitle||d?.title||'Kolekcja')+' — '+brand.name)
 if(!d)return <NotFound/>
 return <><EditorialHero document={d}/><section className="shell section drop-detail"><DropMeta document={d}/>{d.showWaitlist&&phase(d,Date.now())!=='ended'&&<DropInterest document={d}/>}</section>{d.showProducts&&<section className="shell section"><h2>W tej kolekcji</h2><div className={'editorial-products drop-products-'+d.layout}>{(d.productSlugs||[]).map(slug=>products.find(p=>p.slug===slug)).filter(p=>!!p).map(p=><ProductCard key={p.slug} product={p}/>)}</div></section>}<EditorialSections sections={d.sections}/><p className="shell section"><Link to="/collections">Wszystkie kolekcje</Link></p></>
}
function DropInterest({document:d}:{document:EditorialDocument}){
 const [busy,setBusy]=useState(false),[status,setStatus]=useState('')
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setStatus('');const f=new FormData(e.currentTarget);try{const r=await post<{emailEnabled:boolean}>('/api/drops/'+d.id+'/interest',{email:f.get('email'),consent:true});setStatus(r.emailEnabled?'Sprawdź pocztę i potwierdź zapis, jeśli nie jesteś jeszcze subskrybentem.':'Zapisano zainteresowanie. Wysyłka wiadomości oczekuje na uruchomienie poczty.')}catch(e){setStatus((e as Error).message)}finally{setBusy(false)}}
 return <form onSubmit={submit} className="drop-interest"><h2>Bądź blisko premiery.</h2><label className="field">E-mail<input name="email" type="email" autoComplete="email" required maxLength={254}/></label><label className="check"><input type="checkbox" required/>Chcę otrzymywać wiadomości o kolekcjach Mariano, w tym tym dropie. Mogę wypisać się w każdej chwili.</label><Link to="/privacy">Prywatność</Link><button className="btn" disabled={busy}>{busy?'Zapisujemy…':'Zapisz mnie'}</button><p role="status">{status}</p></form>
}
export function HelpCenter(){return <><PageHeading eyebrow="MARIANO / POMOC" title="Jesteśmy blisko."/><section className="shell section help-grid">{[['/track','Twoje zamówienie','Status, wiadomości i ustalenia.'],['/size-guide','Dobierz rozmiar','Pomiary krok po kroku.'],['/shipping-returns','Dostawa i zwroty','Wszystko o przesyłce.'],['/faq','Pytania i odpowiedzi','Krótko i konkretnie.'],['/contact','Kontakt','Napisz do zespołu.']].map(([url,title,text])=><Link to={url} key={url}><h2>{title}</h2><p>{text}</p></Link>)}</section></>}
