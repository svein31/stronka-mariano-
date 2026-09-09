import assert from 'node:assert/strict'
import {test,after,beforeEach} from 'node:test'
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {randomBytes,randomUUID} from 'node:crypto'
import {openDatabase} from '../server/database.mjs'
import {getConfig} from '../server/config.mjs'
import {createApp} from '../server/app.mjs'
import {paymentAdapter} from '../server/payments.mjs'
const directory=await mkdtemp(join(tmpdir(),'workshop-test-')),path=join(directory,'store.sqlite')
const db=openDatabase(path),config=getConfig({}),app=createApp({db,config})
await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve))
const base='http://127.0.0.1:'+app.address().port
beforeEach(()=>db.prepare('DELETE FROM rate_limits').run())
after(async()=>{await new Promise(resolve=>app.close(resolve));db.close();await rm(directory,{recursive:true,force:true})})
async function request(route,body,extra={}) {
 const res=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{Origin:'http://localhost:5173','Content-Type':'application/json',...extra},body:body===undefined?undefined:JSON.stringify(body)})
 return {status:res.status,data:await res.json(),headers:res.headers}
}
const line={slug:'botanika',size:'M',variant:'Kobalt / ecru',quantity:2}
const customer={name:'Test Person',email:'test@example.com',street:'Testowa 1',postalCode:'00-001',city:'Warszawa',country:'PL',notes:''}
test('Static caching revalidates changed photographs and keeps missing assets out of the SPA',async()=>{
 const dist=join(directory,'static-fixture');await mkdir(join(dist,'assets'),{recursive:true});await mkdir(join(dist,'media'))
 await writeFile(join(dist,'index.html'),'<h1>Store</h1>');await writeFile(join(dist,'assets','entry-abcd1234.js'),'export {}');await writeFile(join(dist,'media','photo.webp'),'fixture-photo')
 const server=createApp({db,config,dist});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port
 try {
  const image=await fetch(origin+'/media/photo.webp');assert.equal(image.status,200);assert.equal(image.headers.get('cache-control'),'no-cache');const etag=image.headers.get('etag');assert.ok(etag)
  const cached=await fetch(origin+'/media/photo.webp',{headers:{'If-None-Match':etag}});assert.equal(cached.status,304);assert.equal(await cached.text(),'')
  await writeFile(join(dist,'media','photo.webp'),'updated-photograph');const changed=await fetch(origin+'/media/photo.webp',{headers:{'If-None-Match':etag}});assert.equal(changed.status,200);assert.notEqual(changed.headers.get('etag'),etag)
  const asset=await fetch(origin+'/assets/entry-abcd1234.js');assert.match(asset.headers.get('cache-control'),/immutable/)
  const head=await fetch(origin+'/media/photo.webp',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'')
  const route=await fetch(origin+'/shop');assert.equal(route.headers.get('cache-control'),'no-cache');assert.match(await route.text(),/Store/)
  assert.equal((await fetch(origin+'/media/missing.webp')).status,404);assert.equal((await fetch(origin+'/assets/missing.js')).status,404)
 }finally{await new Promise(resolve=>server.close(resolve))}
})
async function orderBody(overrides={}) {
 const selection={lines:[line],shipping:'courier'}
 const quote=await request('/api/quote',selection)
 return {...selection,customer,acknowledged:true,quoteFingerprint:quote.data.fingerprint,idempotencyKey:randomUUID(),accessToken:randomBytes(32).toString('hex'),...overrides}
}
test('Health and catalog expose demo mode and disabled payments',async()=>{
 assert.equal((await request('/api/health')).status,200)
 const {data}=await request('/api/catalog')
 assert.equal(data.demo,true);assert.equal(data.paymentsEnabled,false);assert.equal(data.products.length,3);assert.ok(data.products.every(p=>!p.madeToOrder&&p.productionCountry==='Bangladesz'))
})
test('Server calculates canonical totals and ignores all client money',async()=>{
 const {data,status}=await request('/api/quote',{lines:[{...line,price:1,total:1}],shipping:'courier',total:1})
 assert.equal(status,200);assert.equal(data.subtotal,98000);assert.equal(data.total,99900);assert.equal(data.currency,'PLN');assert.equal(data.fingerprint.length,64)
})
for(const [name,selection] of [
 ['empty basket',{lines:[],shipping:'courier'}],
 ['unknown product',{lines:[{...line,slug:'missing'}],shipping:'courier'}],
 ['unknown size',{lines:[{...line,size:'XXL'}],shipping:'courier'}],
 ['unknown variant',{lines:[{...line,variant:'other'}],shipping:'courier'}],
 ['negative quantity',{lines:[{...line,quantity:-1}],shipping:'courier'}],
 ['fractional quantity',{lines:[{...line,quantity:1.5}],shipping:'courier'}],
 ['excess quantity',{lines:[{...line,quantity:11}],shipping:'courier'}],
 ['duplicate rows',{lines:[line,line],shipping:'courier'}],
 ['unknown shipping',{lines:[line],shipping:'free'}]
]) test('Quote rejects '+name,async()=>assert.equal((await request('/api/quote',selection)).status,400))
test('An order is durably saved without payment; only a private bearer can read it',async()=>{
 const body=await orderBody(),result=await request('/api/orders',body)
 assert.equal(result.status,201)
 const id=result.data.id
 assert.equal((await request('/api/orders/'+id)).status,404)
 assert.equal((await request('/api/orders/'+id,undefined,{Authorization:'Bearer '+randomBytes(32).toString('hex')})).status,404)
 const receipt=await request('/api/orders/'+id,undefined,{Authorization:'Bearer '+body.accessToken})
 assert.equal(receipt.status,200);assert.equal(receipt.data.paymentStatus,'not_requested');assert.equal(receipt.data.status,'awaiting_arrangement');assert.equal(receipt.data.quote.total,99900);assert.equal(receipt.data.customer.name,customer.name)
 assert.equal(receipt.headers.get('cache-control'),'no-store')
 assert.ok(!JSON.stringify(receipt.data).includes(body.accessToken))
 const second=openDatabase(path)
 try {const saved=second.prepare('SELECT amount,payment_status,access_hash FROM orders WHERE id=?').get(id);assert.equal(saved.amount,99900);assert.equal(saved.payment_status,'not_requested');assert.notEqual(saved.access_hash,body.accessToken)}
 finally {second.close()}
})
test('A lost response can be retried without duplicating the order',async()=>{
 const body=await orderBody()
 const [a,b]=await Promise.all([request('/api/orders',body),request('/api/orders',body)])
 assert.equal(a.status,201);assert.equal(b.status,201);assert.equal(a.data.id,b.data.id)
 assert.equal(db.prepare('SELECT count(*) AS n FROM orders WHERE idempotency_key=?').get(body.idempotencyKey).n,1)
 const conflict=await request('/api/orders',{...body,customer:{...customer,notes:'Different request'}})
 assert.equal(conflict.status,409)
})
test('Changed quote is rejected before persistence',async()=>{
 const body=await orderBody({quoteFingerprint:'stale'})
 assert.equal((await request('/api/orders',body)).status,409)
 assert.equal(db.prepare('SELECT count(*) AS n FROM orders WHERE idempotency_key=?').get(body.idempotencyKey).n,0)
})
test('Courier requires a valid Polish delivery address',async()=>{
 for(const changed of [{street:''},{postalCode:'123456'},{country:'DE'},{email:'invalid'}]) {
  const result=await request('/api/orders',await orderBody({customer:{...customer,...changed}}))
  assert.equal(result.status,400)
 }
})
test('Pickup does not require an address and has no delivery fee',async()=>{
 const selection={lines:[line],shipping:'pickup'}
 const quote=await request('/api/quote',selection)
 const body=await orderBody({...selection,quoteFingerprint:quote.data.fingerprint,customer:{name:'Test Person',email:'test@example.com',notes:''}})
 assert.equal((await request('/api/orders',body)).status,201);assert.equal(quote.data.total,98000)
})
test('Order acknowledgement is required',async()=>assert.equal((await request('/api/orders',await orderBody({acknowledged:false}))).status,400))
test('Cross-origin writes and payment endpoints are rejected',async()=>{
 assert.equal((await request('/api/quote',{lines:[line],shipping:'courier'},{Origin:'https://other.example'})).status,403)
 assert.equal((await request('/api/payments',{})).status,404)
 await assert.rejects(paymentAdapter.createSession({amount:1}),/disabled/)
})
test('Contact and newsletter requests persist; neither claims delivery',async()=>{
 assert.equal((await request('/api/contact',{name:'Test',email:'test@example.com',message:'A sufficiently long test message.'})).status,400)
 const contact=await request('/api/contact',{name:'Test',email:'test@example.com',message:'A sufficiently long test message.',acknowledged:true})
 assert.equal(contact.status,201);assert.equal(contact.data.status,'saved')
 assert.ok(db.prepare('SELECT id FROM contact_messages WHERE id=?').get(contact.data.id))
 assert.equal((await request('/api/newsletter',{email:'test@example.com',consent:false})).status,400)
 for(let i=0;i<2;i++)assert.equal((await request('/api/newsletter',{email:'test@example.com',consent:true})).data.status,'pending_confirmation')
 assert.equal(db.prepare('SELECT count(*) AS n FROM newsletter_requests WHERE email=?').get('test@example.com').n,1)
})
test('JSON errors are explicit and private endpoints never fall back to the SPA',async()=>{
 const malformed=await fetch(base+'/api/quote',{method:'POST',headers:{Origin:'http://localhost:5173','Content-Type':'application/json'},body:'{'})
 assert.equal(malformed.status,400)
 const wrongType=await fetch(base+'/api/quote',{method:'POST',headers:{Origin:'http://localhost:5173','Content-Type':'text/plain'},body:'{}'})
 assert.equal(wrongType.status,415)
 assert.equal((await request('/api/quote',{payload:'x'.repeat(33000)})).status,413)
 assert.equal((await request('/api/missing')).status,404)
 const missing=await fetch(base+'/media/missing.webp');assert.equal(missing.status,404)
})
test('Rate limiter ignores untrusted forwarding headers',async()=>{
 const limited=createApp({db,config,rateLimit:2})
 await new Promise(resolve=>limited.listen(0,'127.0.0.1',resolve))
 try {
  const url='http://127.0.0.1:'+limited.address().port+'/api/health'
  assert.equal((await fetch(url)).status,200);assert.equal((await fetch(url)).status,200)
  const third=await fetch(url,{headers:{'X-Forwarded-For':'198.51.100.1'}});assert.equal(third.status,429);assert.equal(third.headers.get('retry-after'),'600')
 } finally {await new Promise(resolve=>limited.close(resolve))}
})
test('Live mode fails closed until identity, origin and policies are configured',()=>{
 assert.throws(()=>getConfig({STORE_MODE:'live'}),/Live mode requires/)
 const live=getConfig({STORE_MODE:'live',PUBLIC_ORIGIN:'https://shop.example',SELLER_NAME:'Test',SELLER_EMAIL:'test@example.com',SELLER_ADDRESS:'Test address',RETURNS_ADDRESS:'Test address',POLICIES_APPROVED:'true',POLICY_VERSION:'approved-v1'})
 assert.equal(live.demo,false);assert.equal(live.paymentsEnabled,false)
})
