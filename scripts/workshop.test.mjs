import assert from 'node:assert/strict'
import {test} from 'node:test'
import {randomBytes,randomUUID} from 'node:crypto'
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {generateSecret,generate} from 'otplib'
import sharp from 'sharp'
import {openDatabase} from '../server/database.mjs'
import {createApp} from '../server/app.mjs'
import {getConfig} from '../server/config.mjs'
import {passwordHash,digest,encrypt,decrypt,clientIP,limit} from '../server/security.mjs'
import {listProducts} from '../server/catalog.mjs'
import {deliverMail,enqueueMail} from '../server/mail.mjs'
import {runBackup,restoreBackup} from '../server/backup.mjs'
const password='fixture-only-'+randomUUID(),hashed=await passwordHash(password)
async function fixture(fn,overrides={}){
 const db=openDatabase(':memory:'),env={ADMIN_EMAIL:'owner@example.test',ADMIN_PASSWORD_HASH:hashed,DATA_KEY:randomBytes(32).toString('hex'),PUBLIC_ORIGIN:'http://localhost:5173',...overrides}
 const app=createApp({db,config:getConfig(env),env,rateLimit:1000})
 await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve))
 const base='http://127.0.0.1:'+app.address().port
 let auth={}
 const request=async(path,body,headers={})=>{
  const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{Origin:env.PUBLIC_ORIGIN,'Content-Type':'application/json',...auth,...headers},body:body===undefined?undefined:JSON.stringify(body)})
  return {status:response.status,headers:response.headers,data:response.headers.get('content-type')?.includes('application/json')?await response.json():Buffer.from(await response.arrayBuffer())}
 }
 async function signIn(otp){
  const response=await request('/api/admin/login',{email:env.ADMIN_EMAIL,password,otp})
  assert.equal(response.status,200)
  auth={Cookie:response.headers.get('set-cookie').split(';')[0],'X-CSRF-Token':response.data.csrf}
  return response
 }
 async function order(){
  const lines=[{slug:'botanika',size:'M',variant:'Kobalt / ecru',quantity:1}],shipping='pickup'
  const q=await request('/api/quote',{lines,shipping})
  const accessToken=randomBytes(32).toString('hex')
  const body={lines,shipping,customer:{name:'Fixture Person',email:'customer@example.test',notes:''},acknowledged:true,quoteFingerprint:q.data.fingerprint,idempotencyKey:randomUUID(),accessToken}
  const r=await request('/api/orders',body)
  assert.equal(r.status,201)
  return {id:r.data.id,token:accessToken,body}
 }
 try{await fn({db,env,request,signIn,order,base})}finally{await new Promise(resolve=>app.close(resolve));db.close()}
}
test('Owner auth protects every write, uses HttpOnly cookies, CSRF and expires sessions',()=>fixture(async({db,request,signIn})=>{
 assert.equal((await request('/api/admin/dashboard')).status,401)
 assert.equal((await request('/api/admin/login',{email:'owner@example.test',password:'wrong'})).status,401)
 const login=await signIn()
 assert.match(login.headers.get('set-cookie'),/HttpOnly/);assert.match(login.headers.get('set-cookie'),/SameSite=Strict/)
 const p=listProducts(db)[0]
 assert.equal((await request('/api/admin/products/'+p.slug,p,{'X-CSRF-Token':'wrong'})).status,403)
 assert.equal((await request('/api/admin/products/'+p.slug,p,{Origin:'https://attacker.example'})).status,403)
 db.prepare('UPDATE admin_sessions SET expires=0').run()
 assert.equal((await request('/api/admin/dashboard')).status,401)
}))
test('TOTP is checked and replayed codes cannot create another session',async()=>{
 const secret=generateSecret()
 await fixture(async({signIn,request})=>{
  assert.equal((await request('/api/admin/login',{email:'owner@example.test',password})).status,401)
  const otp=await generate({secret})
  await signIn(otp)
  assert.equal((await request('/api/admin/login',{email:'owner@example.test',password,otp})).status,401)
 },{ADMIN_TOTP_SECRET:secret})
})
test('Live owner login refuses password-only configuration',()=>fixture(async({request})=>{
 assert.equal((await request('/api/admin/login',{email:'owner@example.test',password})).status,503)
 },{STORE_MODE:'live',PUBLIC_ORIGIN:'https://shop.example',SELLER_NAME:'Fixture',SELLER_EMAIL:'owner@example.test',SELLER_ADDRESS:'Fixture address',RETURNS_ADDRESS:'Fixture address',POLICIES_APPROVED:'true',POLICY_VERSION:'approved-test'}))
test('Owner catalog changes feed public cards and server prices; stale edits and unavailable products are rejected',()=>fixture(async({db,request,signIn})=>{
 await signIn()
 const p=listProducts(db)[0]
 assert.equal((await request('/api/admin/products/'+p.slug,{...p,price:61000,leadTime:'20 dni'})).status,200)
 const catalog=await request('/api/catalog')
 assert.equal(catalog.data.products[0].price,61000)
 const selection={lines:[{slug:p.slug,size:'M',variant:p.variants[0],quantity:1}],shipping:'pickup'}
 assert.equal((await request('/api/quote',selection)).data.total,61000)
 assert.equal((await request('/api/admin/products/'+p.slug,p)).status,409)
 assert.equal((await request('/api/admin/products/'+p.slug,{...listProducts(db)[0],available:false})).status,200)
 assert.equal((await request('/api/quote',selection)).status,400)
}))
test('Verified measurements must cover all offered sizes; media cannot point outside the site',()=>fixture(async({db,request,signIn})=>{
 await signIn();const p=listProducts(db)[0]
 assert.equal((await request('/api/admin/products/'+p.slug,{...p,measurementsVerified:true})).status,400)
 assert.equal((await request('/api/admin/products/'+p.slug,{...p,gallery:[{src:'https://tracker.example/image',alt:'Photo',kind:'full'}]})).status,400)
 assert.equal((await request('/api/admin/products/'+p.slug,{...p,gallery:[{src:'/media/uploads/no-file.webp',alt:'Photo',kind:'full'}]})).status,400)
}))
test('Real order events, ETA and private photographs require the matching order token',()=>fixture(async({db,request,signIn,order})=>{
 const a=await order(),b=await order()
 await signIn()
 const photo=await sharp({create:{width:4,height:4,channels:3,background:'#ffffff'}}).png().toBuffer()
 const asset=await request('/api/admin/uploads',{data:photo.toString('base64'),mime:'image/png',orderId:a.id})
 assert.equal(asset.status,201);assert.equal(asset.data.src,null)
 assert.equal((await request('/media/uploads/'+asset.data.id+'.webp')).status,404)
 const update={revision:1,stage:'sewing',estimatedDate:'2026-10-15',note:'Szwy wykonane ręcznie.',photos:[asset.data.id]}
 assert.equal((await request('/api/admin/orders/'+a.id+'/progress',update)).status,200)
 const tracked=await request('/api/tracking/'+a.id,undefined,{Authorization:'Bearer '+a.token})
 assert.equal(tracked.data.stage,'sewing');assert.equal(tracked.data.events.length,1);assert.equal(tracked.data.estimatedDate,'2026-10-15')
 assert.equal((await request('/api/tracking/'+a.id,undefined,{Authorization:'Bearer '+b.token})).status,404)
 assert.equal((await request('/api/tracking/'+a.id+'/photos/'+asset.data.id,undefined,{Authorization:'Bearer '+b.token})).status,404)
 assert.equal((await request('/api/tracking/'+a.id+'/photos/'+asset.data.id,undefined,{Authorization:'Bearer '+a.token})).headers.get('content-type'),'image/webp')
 assert.equal((await request('/api/admin/orders/'+a.id+'/progress',update)).status,409)
 assert.equal((await request('/api/admin/orders/'+b.id+'/progress',{...update,photos:[asset.data.id]})).status,400)
 assert.equal(db.prepare('SELECT payment_status FROM orders WHERE id=?').get(a.id).payment_status,'not_requested')
}))
test('Access expires, revocation blocks receipt and email tokens; recovery never reveals whether an order exists',()=>fixture(async({db,env,request,signIn,order})=>{
 const a=await order()
 const mail=db.prepare('SELECT payload FROM mail_outbox').get()
 const payload=JSON.parse(decrypt(Buffer.from(mail.payload,'base64'),env.DATA_KEY).toString())
 const emailToken=payload.text.match(/#([a-f0-9-]+)\.([a-f0-9]{64})/)[2]
 assert.equal((await request('/api/tracking/'+a.id,undefined,{Authorization:'Bearer '+emailToken})).status,200)
 db.prepare('UPDATE orders SET access_expires=0 WHERE id=?').run(a.id)
 assert.equal((await request('/api/orders/'+a.id,undefined,{Authorization:'Bearer '+a.token})).status,404)
 await signIn()
 assert.equal((await request('/api/admin/orders/'+a.id+'/revoke',{})).status,200)
 assert.equal((await request('/api/tracking/'+a.id,undefined,{Authorization:'Bearer '+emailToken})).status,404)
 const known=await request('/api/tracking-access',{id:a.id,email:'customer@example.test'})
 const missing=await request('/api/tracking-access',{id:randomUUID(),email:'missing@example.test'})
 assert.deepEqual(known.data,missing.data)
 assert.equal(db.prepare("SELECT count(*) AS n FROM tracking_tokens WHERE revoked=0").get().n,1)
 db.prepare('UPDATE tracking_tokens SET expires=0').run()
 const renewed=JSON.parse(decrypt(Buffer.from(db.prepare("SELECT payload FROM mail_outbox WHERE dedupe LIKE 'recovery:%'").get().payload,'base64'),env.DATA_KEY).toString()).text.match(/#([a-f0-9-]+)\.([a-f0-9]{64})/)[2]
 assert.equal((await request('/api/tracking/'+a.id,undefined,{Authorization:'Bearer '+renewed})).status,404)
}))
