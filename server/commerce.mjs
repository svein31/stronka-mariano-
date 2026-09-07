import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import catalog from '../shared/catalog.json' with {type:'json'}
import commerce from '../shared/commerce.json' with {type:'json'}
export class HttpError extends Error { constructor(status,message,fields={}) { super(message); this.status=status; this.fields=fields } }
export const hash = value => createHash('sha256').update(value).digest('hex')
const fail = (message,fields={}) => {throw new HttpError(400,message,fields)}
export function record(value) { if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Nieprawidłowe dane.'); return value }
export function textField(value,key,min,max) {
  if (typeof value !== 'string') fail('Sprawdź formularz.',{[key]:'Uzupełnij pole.'})
  const clean=value.trim()
  if (clean.length<min || clean.length>max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(clean)) fail('Sprawdź formularz.',{[key]:'Nieprawidłowa długość lub znaki.'})
  return clean
}
export function emailField(value) {
  const email=textField(value,'email',3,254).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Sprawdź adres e-mail.',{email:'Podaj prawidłowy adres e-mail.'})
  return email
}
export function quoteOrder(body) {
  record(body)
  if (!Array.isArray(body.lines) || !body.lines.length || body.lines.length>commerce.maxLines) fail('Koszyk musi zawierać od 1 do 20 pozycji.')
  const seen=new Set()
  const lines=body.lines.map(input=>{
    record(input)
    const product=catalog.find(p=>p.slug===input.slug)
    if (!product || !product.sizes.includes(input.size) || !product.variants.includes(input.variant)) fail('Wybrany produkt lub wariant jest niedostępny.')
    if (!product.madeToOrder) throw new HttpError(409,'Ten produkt wymaga potwierdzenia dostępności.')
    if (!Number.isInteger(input.quantity) || input.quantity<1 || input.quantity>commerce.maxQuantity) fail('Wybierz od 1 do 10 sztuk.')
    const key=[product.slug,input.size,input.variant].join('|')
    if (seen.has(key)) fail('Powtórzona pozycja koszyka.')
    seen.add(key)
    return {slug:product.slug,name:product.name,size:input.size,variant:input.variant,quantity:input.quantity,price:product.price,leadTime:product.leadTime,madeToOrder:true}
  }).sort((a,b)=>[a.slug,a.size,a.variant].join('|').localeCompare([b.slug,b.size,b.variant].join('|')))
  const shipping=commerce.shipping.find(s=>s.id===body.shipping)
  if (!shipping) fail('Wybierz sposób dostawy.')
  const subtotal=lines.reduce((sum,l)=>sum+l.price*l.quantity,0)
  const quote={lines,shipping,subtotal,total:subtotal+shipping.price,currency:'PLN'}
  return {...quote,fingerprint:hash(JSON.stringify(quote))}
}
function customerData(input,shipping) {
  record(input)
  const result={name:textField(input.name,'name',2,100),email:emailField(input.email),notes:textField(input.notes??'','notes',0,1000)}
  if (shipping==='courier') {
    result.street=textField(input.street,'street',3,180)
    result.city=textField(input.city,'city',2,100)
    result.postalCode=textField(input.postalCode,'postalCode',6,6)
    if (!/^\d{2}-\d{3}$/.test(result.postalCode)) fail('Sprawdź kod pocztowy.',{postalCode:'Format: 00-000.'})
    if (input.country!=='PL') fail('Obecnie dostawa tylko w Polsce.')
    result.country='PL'
  }
  return result
}
export function createOrder(db,config,body) {
  record(body)
  if (body.acknowledged!==true) fail('Potwierdź zapoznanie się z warunkami.',{acknowledged:'Wymagane potwierdzenie.'})
  if (typeof body.idempotencyKey!=='string' || !/^[a-zA-Z0-9-]{24,80}$/.test(body.idempotencyKey)) fail('Brak identyfikatora próby.')
  if (typeof body.accessToken!=='string' || !/^[a-f0-9]{64}$/.test(body.accessToken)) fail('Brak klucza potwierdzenia.')
  const customer=customerData(body.customer,body.shipping)
  const accessHash=hash(body.accessToken)
  const requestHash=hash(JSON.stringify({lines:body.lines,shipping:body.shipping,customer,quote:body.quoteFingerprint,accessHash,acknowledged:true}))
  db.exec('BEGIN IMMEDIATE')
  try {
    const previous=db.prepare('SELECT id,request_hash FROM orders WHERE idempotency_key=?').get(body.idempotencyKey)
    if (previous) {
      if (previous.request_hash!==requestHash) throw new HttpError(409,'Ta próba jest już przypisana do innego zamówienia.')
      db.exec('COMMIT')
      return {id:previous.id,replayed:true}
    }
    const quote=quoteOrder(body)
    if (quote.fingerprint!==body.quoteFingerprint) throw new HttpError(409,'Cena lub dostawa uległy zmianie. Sprawdź nowe podsumowanie.')
    const id=randomUUID()
    db.prepare(`INSERT INTO orders (id,idempotency_key,request_hash,access_hash,created_at,status,payment_status,currency,amount,snapshot,customer,policy_version,demo) VALUES (?,?,?,?,?,'awaiting_arrangement','not_requested',?,?,?,?,?,?)`).run(id,body.idempotencyKey,requestHash,accessHash,new Date().toISOString(),'PLN',quote.total,JSON.stringify(quote),JSON.stringify(customer),config.policyVersion,Number(config.demo))
    db.exec('COMMIT')
    return {id,replayed:false}
  } catch(error) { db.exec('ROLLBACK'); throw error }
}
export function readOrder(db,id,token) {
  const row=db.prepare('SELECT * FROM orders WHERE id=?').get(id)
  const valid=typeof token==='string' && /^[a-f0-9]{64}$/.test(token)
  if (!row || !valid || !timingSafeEqual(Buffer.from(row.access_hash,'hex'),Buffer.from(hash(token),'hex'))) throw new HttpError(404,'Nie znaleziono potwierdzenia lub klucz jest nieprawidłowy.')
  return {id:row.id,createdAt:row.created_at,status:row.status,paymentStatus:row.payment_status,demo:Boolean(row.demo),quote:JSON.parse(row.snapshot),customer:JSON.parse(row.customer)}
}
