import {useEffect,useRef,useState,type FormEvent} from 'react'
import {Link,useLocation,useNavigate} from 'react-router-dom'
import {useCart,toOrderLines,type CartInput} from '../state/cart'
import {useStore} from '../state/store'
import {api,post,ApiError,type Quote,type Customer,type Receipt} from '../lib/api'
import {formatPrice} from '../data/collection'
import commerce from '../../shared/commerce.json'
import {PageHeading} from './Pages'
interface OrderRequest {reviewedQuote:Quote;lines:CartInput[];shipping:string;customer:Customer;acknowledged:boolean;quoteFingerprint:string;idempotencyKey:string;accessToken:string}
const PENDING='workshop.pending-order.v1',RECEIPT='workshop.receipt.v1'
export function readPending():OrderRequest|null {
 try {
  const p=JSON.parse(sessionStorage.getItem(PENDING)||'null')
  return p && p.reviewedQuote && Array.isArray(p.reviewedQuote.lines) && typeof p.reviewedQuote.total==='number' && p.reviewedQuote.shipping && Array.isArray(p.lines)&&p.lines.length&&p.lines.every((l:CartInput)=>l&&typeof l.slug==='string'&&typeof l.size==='string'&&typeof l.variant==='string'&&Number.isInteger(l.quantity)&&l.quantity>0)&&['name','email','street','postalCode','city','country','notes'].every(k=>typeof p.customer?.[k]==='string')&&typeof p.shipping==='string'&&/^[a-f0-9]{64}$/.test(p.accessToken)&&typeof p.idempotencyKey==='string'&&typeof p.quoteFingerprint==='string'?p:null
 }catch{return null}
}
export function OrderSummary({quote}:{quote:Quote}) {
 return <div className="order-summary"><h2>Twoje zamówienie</h2><ul>{quote.lines.map(l=><li key={[l.slug,l.size,l.variant].join('|')}><div><strong>{l.name}</strong><p className="small">{l.size} · {l.variant} · {l.quantity} szt.</p><p className="small">Szycie: {l.leadTime}</p></div><span>{formatPrice(l.price*l.quantity)}</span></li>)}</ul>
 <p className="total"><span>Produkty</span><span>{formatPrice(quote.subtotal)}</span></p><p className="total"><span>{quote.shipping.label}</span><span>{formatPrice(quote.shipping.price)}</span></p><p className="total total--final"><strong>Łącznie</strong><strong>{formatPrice(quote.total)}</strong></p><p className="small">Nie pobieramy płatności na stronie. Zapis nie potwierdza jeszcze przyjęcia do realizacji.</p></div>
}
export function Checkout() {
 const cart=useCart(),{config,error:configError,retry}=useStore(),navigate=useNavigate()
 const [pending,setPending]=useState(readPending)
 const [customer,setCustomer]=useState<Customer>(pending?.customer||{name:'',email:'',street:'',postalCode:'',city:'',country:'PL',notes:''})
 const [shipping,setShipping]=useState(pending?.shipping||'courier'),[acknowledged,setAcknowledged]=useState(pending?.acknowledged||false)
 const [quote,setQuote]=useState<Quote|null>(null),[error,setError]=useState(''),[fields,setFields]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false),[attempt,setAttempt]=useState(0)
 const errorRef=useRef<HTMLDivElement>(null),inFlight=useRef(false)
 const lines=JSON.stringify(pending?.lines||toOrderLines(cart.lines))
 useEffect(()=>{let active=true;setQuote(null);if(pending){setQuote(pending.reviewedQuote);return}if(!JSON.parse(lines).length)return;post<Quote>('/api/quote',{lines:JSON.parse(lines),shipping}).then(q=>{if(active)setQuote(q)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[lines,shipping,attempt,pending])
 useEffect(()=>{if(error)errorRef.current?.focus()},[error])
 async function submit(event:FormEvent) {
  event.preventDefault();if(inFlight.current||!config||(!pending&&!quote))return
  inFlight.current=true;setBusy(true);setError('');setFields({})
  let body=pending
  try {
   if(!body) {
    const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('')
    body={reviewedQuote:quote!,lines:JSON.parse(lines),shipping,customer,acknowledged,quoteFingerprint:quote!.fingerprint,idempotencyKey:crypto.randomUUID(),accessToken:token}
    // Persist before the request: a lost response can be retried with the same key.
    sessionStorage.setItem(PENDING,JSON.stringify(body));setPending(body)
   }
   const result=await post<{id:string}>('/api/orders',body)
   if(typeof result.id!=='string')throw new ApiError('Nieprawidłowe potwierdzenie. Ponów zapis.')
   const receipt={id:result.id,token:body.accessToken}
   try {sessionStorage.setItem(RECEIPT,JSON.stringify(receipt));sessionStorage.removeItem(PENDING)}catch{}
   setPending(null);cart.consume(body.lines)
   navigate('/order-confirmation',{replace:true,state:receipt})
  } catch(e) {
   const err=e instanceof ApiError?e:new ApiError('Przeglądarka nie pozwala zapisać próby zamówienia. Zezwól na pamięć sesji i spróbuj ponownie.')
   setError(err.message);setFields(err.fields)
   if(err.status>=400&&err.status<500&&err.status!==429) {try{sessionStorage.removeItem(PENDING)}catch{}setPending(null);setAttempt(n=>n+1)}
  } finally {inFlight.current=false;setBusy(false)}
 }
 function field(key:keyof Customer,label:string,type='text',autoComplete?:string,required=true) {
  return <label className="field" key={key}>{label}<input name={key} type={type} value={customer[key]} required={required} maxLength={key==='email'?254:180} autoComplete={autoComplete} aria-invalid={!!fields[key]} aria-describedby={fields[key]?key+'-error':undefined} pattern={key==='postalCode'?'[0-9]{2}-[0-9]{3}':undefined} onChange={e=>setCustomer(c=>({...c,[key]:e.target.value}))}/>{fields[key]&&<span className="field-error" id={key+'-error'}>{fields[key]}</span>}</label>
 }
 return <><PageHeading eyebrow="Jeszcze jeden krok" title="Twoja para. Twoje dane." text="Zapisz zamówienie do uzgodnienia z pracownią. Na tym etapie niczego nie płacisz."/>
 <section className="shell section checkout-grid solid-stage">
 {!cart.lines.length&&!pending?<p className="empty">Koszyk jest pusty. <Link to="/shop">Wybierz spodnie →</Link></p>:<>
 <form onSubmit={submit} className="checkout-form">
 {config?.demo&&<p className="notice">Tryb demonstracyjny. Użyj danych testowych — to nie jest działający sklep.</p>}
 {configError&&<p role="alert">{configError} <button type="button" onClick={retry}>Połącz ponownie</button></p>}
 {error&&<div className="error" tabIndex={-1} ref={errorRef} role="alert">{error} {!pending&&<button type="button" onClick={()=>{setError('');setAttempt(n=>n+1)}}>Odśwież podsumowanie</button>}</div>}
 {pending&&<p className="notice">Zachowaliśmy dane tej próby. Ponowienie sprawdzi ten sam zapis i nie utworzy drugiego zamówienia. Dane: {pending.customer.name}, {pending.customer.email}. Dostawa: {pending.shipping==='courier'?'kurier':'odbiór'}. {pending.customer.street}</p>}
 <fieldset disabled={busy||!!pending}><legend>01 / Kontakt</legend>{field('name','Imię i nazwisko','text','name')}{field('email','E-mail','email','email')}</fieldset>
 <fieldset disabled={busy||!!pending}><legend>02 / Dostawa</legend>{commerce.shipping.map(s=><label className="shipping-choice" key={s.id}><input type="radio" name="shipping" value={s.id} checked={shipping===s.id} onChange={()=>{setError('');setShipping(s.id)}}/><span><strong>{s.label} · {formatPrice(s.price)}</strong><small>{s.description}</small></span></label>)}
 {shipping==='courier'&&<>{field('street','Ulica i numer','text','street-address')}<div className="field-row">{field('postalCode','Kod pocztowy','text','postal-code')}{field('city','Miejscowość','text','address-level2')}</div><p className="small">Kraj dostawy: Polska</p></>}</fieldset>
 <fieldset disabled={busy||!!pending}><legend>03 / Ustalenia</legend><label className="field">Uwagi (opcjonalnie)<textarea name="notes" value={customer.notes} maxLength={1000} onChange={e=>setCustomer(c=>({...c,notes:e.target.value}))}/></label>
 <label className="check"><input type="checkbox" required checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)}/><span>Zapoznałem/am się z <Link to="/terms">warunkami zamówienia</Link>, <Link to="/shipping-returns">dostawą i zwrotami</Link> oraz <Link to="/privacy">informacją o prywatności</Link>. Rozumiem, że zapis wymaga potwierdzenia pracowni i nie pobiera płatności.</span></label></fieldset>
 <button className="btn" disabled={busy||!config||(!quote&&!pending)}>{busy?'Zapisujemy…':pending?'Ponów zapis tej samej próby →':'Zapisz zamówienie bez płatności →'}</button>
 <p className="small">Potwierdzenie będzie dostępne w tej karcie. {config?.emailEnabled?'Dostęp do realizacji wyślemy również e-mailem.':'Wysyłka e-mail wymaga konfiguracji poczty przez pracownię.'}</p>
 </form><aside>{quote?<OrderSummary quote={quote}/>:<p role="status">Sprawdzamy ceny i dostawę…</p>}</aside>
 </>}
 </section></>
}
export function OrderConfirmation() {
 const location=useLocation()
 const [key]=useState<{id:string;token:string}|null>(()=>{try{return location.state||JSON.parse(sessionStorage.getItem(RECEIPT)||'null')}catch{return null}})
 const [receipt,setReceipt]=useState<Receipt|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0)
 useEffect(()=>{if(!key?.id||!key?.token)return;let active=true;setError('');api<Receipt>('/api/orders/'+encodeURIComponent(key.id),{headers:{Authorization:'Bearer '+key.token}}).then(r=>{if(active)setReceipt(r)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[key,attempt])
 return <><PageHeading eyebrow="Potwierdzenie zapisu" title={receipt?'Mamy Twój wybór.':'Twoje potwierdzenie.'} text={receipt?'Zamówienie oczekuje na uzgodnienie. Płatność nie została pobrana.':'Potwierdzenie jest dostępne tylko z prywatnym kluczem zapisanym w tej karcie.'}/>
 <section className="shell section receipt solid-stage">{!key?<p>Nie ma zapisanego potwierdzenia. <Link to="/shop">Wróć do kolekcji</Link>.</p>:error?<p role="alert">{error} <button onClick={()=>setAttempt(n=>n+1)}>Ponów</button></p>:!receipt?<p role="status">Pobieramy zapis…</p>:<>
 {receipt.demo&&<p className="notice">Zamówienie demonstracyjne — nie trafi do realizacji.</p>}<p className="small">Numer: {receipt.id}</p><p>Kontakt: {receipt.customer.name} · {receipt.customer.email}</p>
 {receipt.customer.street&&<p>Dostawa: {receipt.customer.street}, {receipt.customer.postalCode} {receipt.customer.city}</p>}
 <Link className="btn" to="/track" state={key}>Zobacz realizację zamówienia</Link><OrderSummary quote={receipt.quote}/><p>Status: oczekuje na uzgodnienie. To potwierdzenie zapisu, nie potwierdzenie zawarcia umowy.</p><button className="btn btn--outline" onClick={()=>window.print()}>Drukuj / zapisz jako PDF</button><p><Link to="/shop">Wróć do spodni →</Link></p></>}</section></>
}
