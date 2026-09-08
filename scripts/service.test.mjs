import assert from 'node:assert/strict'
import {test} from 'node:test'
import {randomUUID,randomBytes} from 'node:crypto'
import {mkdtemp,rm,writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import sharp from 'sharp'
import {openDatabase} from '../server/database.mjs'
import {createApp} from '../server/app.mjs'
import {getConfig} from '../server/config.mjs'
import {digest} from '../server/security.mjs'
import {createOrder,quoteOrder} from '../server/commerce.mjs'
import {offerSpecification,decideSpecification,stockChange,reserveMaterials,settleMaterials,capacity,planTask,convertCustom} from '../server/service.mjs'
import {personalize,saveAsset} from '../server/workshop.mjs'
import {enqueueJob,runJobs} from '../server/jobs.mjs'
import {mediaStore,migrateAsset,assetData} from '../server/media-store.mjs'
import {carrier,scheduleShipment,createShipment,refreshShipment} from '../server/shipping.mjs'
import {runBackup,restoreBackup,restoreMedia} from '../server/backup.mjs'
const env={ADMIN_EMAIL:'owner@example.test',ADMIN_PASSWORD_HASH:'private-test-hash',PUBLIC_ORIGIN:'http://localhost:5173',DATA_KEY:randomBytes(32).toString('hex')}
const config=getConfig(env)
const dbFixture=async fn=>{const db=openDatabase(':memory:');try{await fn(db)}finally{db.close()}}
function order(db){const token=randomBytes(32).toString('hex'),lines=[{slug:'botanika',size:'M',variant:'Kobalt / ecru',quantity:1}],shipping='pickup';const q=quoteOrder({lines,shipping},db);const r=createOrder(db,config,{lines,shipping,customer:{name:'Test Person',email:'buyer@example.test',notes:''},acknowledged:true,idempotencyKey:randomUUID(),accessToken:token,quoteFingerprint:q.fingerprint},env);return {...r,token}}
const offer={previousVersion:0,amount:55000,estimatedDate:'2026-12-10',validDays:7,description:'Spodnie na wymiar',material:'Len',measurements:'Pas ciała 80 cm',delivery:'Odbiór w pracowni'}
function accept(db,id){const s=offerSpecification(db,id,offer,'owner',env);decideSpecification(db,id,{specificationId:s.id,decision:'accept',acknowledged:true},env);return s}
async function httpFixture(fn){return dbFixture(async db=>{
 const app=createApp({db,config,env,rateLimit:1000});await new Promise(r=>app.listen(0,'127.0.0.1',r))
 const sessions={}
 for(const role of ['owner','production','support']){
  const secret=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex'),actor=role==='owner'?'owner':randomUUID()
  if(role!=='owner')db.prepare('INSERT INTO staff(id,email,name,role,password_hash,totp_secret) VALUES(?,?,?,?,?,?)').run(actor,role+'@example.test',role,role,env.ADMIN_PASSWORD_HASH,'test-totp')
  db.prepare('INSERT INTO admin_sessions VALUES(?,?,?,?,?,?)').run(digest(secret),csrf,Date.now()+600000,Date.now(),digest(env.ADMIN_PASSWORD_HASH+(role==='owner'?'':'test-totp')),actor)
  sessions[role]={Cookie:'mariano_owner='+secret,'X-CSRF-Token':csrf,actor}
 }
 async function request(path,body,role,extra={}){const headers={Origin:env.PUBLIC_ORIGIN,'Content-Type':'application/json',...(sessions[role]||{}),...extra};delete headers.actor;const r=await fetch('http://127.0.0.1:'+app.address().port+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,headers:r.headers,data:await r.json()}}
 try{await fn({db,request,sessions})}finally{await new Promise(r=>app.close(r))}
})}
test('Versioned customer API requires the matching token, enforces origin and returns a stable error envelope',()=>httpFixture(async({db,request})=>{
 const a=order(db),b=order(db),url='/api/v1/service/orders/'+a.id
 assert.equal((await request(url)).status,404)
 assert.equal((await request(url,undefined,null,{Authorization:'Bearer '+b.token})).status,404)
 const ok=await request(url,undefined,null,{Authorization:'Bearer '+a.token});assert.equal(ok.status,200);assert.equal(ok.headers.get('API-Version'),'1')
 const bad=await request(url+'/messages',{content:'Hello',requestKey:randomUUID()},null,{Authorization:'Bearer '+a.token,Origin:'https://evil.example'});assert.equal(bad.status,403);assert.equal(bad.data.code,'forbidden');assert.match(bad.data.requestId,/^[a-f0-9-]{36}$/)
}))
test('Staff roles cannot edit products, send unauthorized messages, cancel orders or administer staff',()=>httpFixture(async({db,request})=>{
 const a=order(db)
 for(const role of ['production','support']){
  assert.equal((await request('/api/v1/admin/products/botanika',{},role)).status,403)
  assert.equal((await request('/api/v1/admin/service/staff',{id:'owner',role:'owner',active:false,revision:1},role)).status,403)
  const dash=await request('/api/v1/admin/dashboard',undefined,role);assert.equal(dash.data.role,role);assert.deepEqual(dash.data.audit,[])
 }
 assert.equal((await request('/api/v1/admin/service/orders/'+a.id+'/specifications',offer,'production')).status,403)
 assert.equal((await request('/api/v1/admin/orders/'+a.id+'/progress',{stage:'cancelled'},'production')).status,403)
 assert.equal((await request('/api/v1/admin/service/capacity',{day:'2026-10-10',capacity:480},'support')).status,403)
 assert.equal((await request('/api/v1/admin/service/capacity',{day:'2026-10-10',capacity:480},'production')).status,200)
 assert.equal((await request('/api/v1/admin/service/orders/'+a.id+'/specifications',offer,'support')).status,200)
 const privateDash=await request('/api/admin/dashboard',undefined,'production');assert.equal(privateDash.data.orders[0].customer.email,undefined)
}))
test('Changing staff roles invalidates sessions; CSRF protects versioned writes',()=>httpFixture(async({request,sessions})=>{
 assert.equal((await request('/api/v1/admin/service/capacity',{day:'2026-10-10',capacity:480},'owner',{'X-CSRF-Token':'wrong'})).status,403)
 const body={id:sessions.production.actor,role:'support',active:true,revision:1}
 assert.equal((await request('/api/v1/admin/service/staff',body,'owner')).status,200)
 assert.equal((await request('/api/v1/admin/service',undefined,'production')).status,401)
 assert.equal((await request('/api/v1/admin/service/staff',body,'owner')).status,409)
}))
test('New quotes supersede pending quotes, reject stale acceptance and preserve immutable accepted content without payment',()=>dbFixture(db=>{
 const a=order(db),v1=offerSpecification(db,a.id,offer,'owner',env)
 const v2=offerSpecification(db,a.id,{...offer,previousVersion:1,amount:62000},'owner',env)
 assert.throws(()=>decideSpecification(db,a.id,{specificationId:v1.id,decision:'accept',acknowledged:true},env),e=>e.status===409)
 decideSpecification(db,a.id,{specificationId:v2.id,decision:'accept',acknowledged:true,amount:1},env)
 assert.equal(db.prepare('SELECT amount FROM orders WHERE id=?').get(a.id).amount,62000)
 assert.equal(db.prepare('SELECT payment_status FROM orders WHERE id=?').get(a.id).payment_status,'not_requested')
 assert.equal(decideSpecification(db,a.id,{specificationId:v2.id,decision:'accept',acknowledged:true},env).replayed,true)
 const before=db.prepare('SELECT content FROM specifications WHERE id=?').get(v2.id).content
 offerSpecification(db,a.id,{...offer,previousVersion:2,description:'Nowa propozycja'},'owner',env)
 assert.equal(db.prepare('SELECT content FROM specifications WHERE id=?').get(v2.id).content,before)
 assert.equal(db.prepare("SELECT count(*) AS n FROM order_events WHERE stage='confirmed'").get().n,1)
}))
test('Expired quotes and changes during production cannot be accepted',()=>dbFixture(db=>{
 const a=order(db),s=offerSpecification(db,a.id,offer,'owner',env)
 db.prepare('UPDATE specifications SET expires=0').run()
 assert.throws(()=>decideSpecification(db,a.id,{specificationId:s.id,decision:'accept',acknowledged:true},env),e=>e.status===409)
 db.prepare("UPDATE orders SET stage='cutting' WHERE id=?").run(a.id)
 assert.throws(()=>offerSpecification(db,a.id,{...offer,previousVersion:1},'owner',env),e=>e.status===409)
}))
test('Messages deduplicate a lost response and reject reuse for different text',()=>httpFixture(async({db,request})=>{
 const a=order(db),path='/api/v1/service/orders/'+a.id+'/messages',headers={Authorization:'Bearer '+a.token},body={content:'Proszę o luźniejszy krój.',requestKey:randomUUID()}
 assert.equal((await request(path,body,null,headers)).status,200)
 assert.equal((await request(path,body,null,headers)).data.replayed,true)
 assert.equal((await request(path,{...body,content:'Inny tekst'},null,headers)).status,409)
 assert.equal(db.prepare('SELECT count(*) AS n FROM order_messages').get().n,1)
}))
test('Personalization opens one linked order and keeps customer measurements',()=>dbFixture(db=>{
 const id=personalize(db,{slug:'botanika',name:'Test Person',email:'buyer@example.test',material:'Bawełna',print:'Stempel',waist:80,hips:100,inseam:76,notes:'',acknowledged:true})
 const a=convertCustom(db,id.id,'owner',env,config),b=convertCustom(db,id.id,'owner',env,config)
 assert.equal(a.id,b.id);assert.equal(b.replayed,true)
 const row=db.prepare('SELECT snapshot,payment_status FROM orders WHERE id=?').get(a.id)
 assert.equal(JSON.parse(row.snapshot).personalization.waist,80);assert.equal(row.payment_status,'not_requested')
}))
test('Stock reservations cannot oversell; replacement rollback, consumption and duplicate delivery are safe',()=>dbFixture(db=>{
 const a=order(db),b=order(db);accept(db,a.id);accept(db,b.id)
 const body={name:'Len',unit:'cm',delta:1000,note:'Dostawa',requestKey:randomUUID()},m=stockChange(db,body,'owner')
 assert.equal(stockChange(db,body,'owner').replayed,true)
 reserveMaterials(db,a.id,{items:[{materialId:m.id,quantity:700}]},'owner')
 assert.throws(()=>reserveMaterials(db,b.id,{items:[{materialId:m.id,quantity:400}]},'owner'),e=>e.status===409)
 assert.throws(()=>reserveMaterials(db,a.id,{items:[{materialId:m.id,quantity:1001}]},'owner'),e=>e.status===409)
 assert.equal(db.prepare("SELECT quantity FROM reservations WHERE state='reserved'").get().quantity,700)
 settleMaterials(db,a.id,'consume','owner');settleMaterials(db,a.id,'consume','owner')
 assert.equal(db.prepare('SELECT stock FROM materials').get().stock,300)
 assert.throws(()=>reserveMaterials(db,a.id,{items:[]},'owner'),e=>e.status===409)
}))
test('Production capacity prevents overbooking and optimistic revisions protect edits',()=>dbFixture(db=>{
 const a=order(db);capacity(db,{day:'2026-10-20',capacity:480},'owner')
 const body={orderId:a.id,day:'2026-10-20',minutes:300,title:'Krojenie',status:'planned'}
 const task=planTask(db,body,'owner')
 assert.equal(planTask(db,{...body,id:task.id,revision:0},'owner').replayed,true)
 assert.throws(()=>planTask(db,{...body,minutes:200},'owner'),e=>e.status===409)
 assert.throws(()=>capacity(db,{day:body.day,capacity:200},'owner'),e=>e.status===409)
 planTask(db,{...body,id:task.id,revision:1,status:'cancelled'},'owner')
 assert.throws(()=>planTask(db,{...body,id:task.id,revision:1},'owner'),e=>e.status===409)
 assert.ok(planTask(db,{...body,minutes:480},'owner').id)
}))
test('Durable queue resumes expired leases, deduplicates jobs and never auto-retries ambiguous shipment creation',()=>dbFixture(async db=>{
 const id=enqueueJob(db,'fixture','one',{id:'record'});assert.equal(enqueueJob(db,'fixture','one'),id)
 db.prepare("UPDATE jobs SET status='running',lease=0 WHERE id=?").run(id)
 let calls=0;await runJobs(db,{fixture:()=>{calls++}});assert.equal(calls,1)
 const ship=enqueueJob(db,'shipment_create','ship',{id:'shipment'})
 await runJobs(db,{shipment_create:()=>{throw Error('timeout')}})
 const row=db.prepare('SELECT * FROM jobs WHERE id=?').get(ship);assert.equal(row.status,'failed');assert.equal(row.attempts,1)
 await runJobs(db,{shipment_create:()=>{calls++}},{now:Date.now()+86400000});assert.equal(calls,1)
}))
test('Media leaves SQLite only after verified storage; thumbnails and private authorization remain',()=>dbFixture(async db=>{
 const dir=await mkdtemp(join(tmpdir(),'mariano-media-test-'))
 try{
  const bytes=await sharp({create:{width:800,height:800,channels:3,background:'#fff'}}).png().toBuffer(),a=order(db)
  const asset=await saveAsset(db,{data:bytes.toString('base64'),mime:'image/png',orderId:a.id})
  await assert.rejects(migrateAsset(db,asset.id,{}, {backend:'disk',put:async()=>{},get:async()=>Buffer.from('bad')}))
  assert.ok(db.prepare('SELECT length(bytes) AS n FROM assets').get().n>0)
  await migrateAsset(db,asset.id,{MEDIA_DIR:dir});const row=db.prepare('SELECT * FROM assets').get()
  assert.equal(row.bytes.length,0);assert.equal(row.order_id,a.id)
  assert.equal((await sharp((await assetData(row,{MEDIA_DIR:dir},true)).bytes).metadata()).width,480)
  await assert.rejects(mediaStore({MEDIA_DIR:dir}).get('../../secret'))
 }finally{await rm(dir,{recursive:true,force:true})}
}))
test('InPost adapter defaults to sandbox and preserves shipment identity on creation and refresh',()=>dbFixture(async db=>{
 const a=order(db);db.prepare("UPDATE orders SET stage='ready' WHERE id=?").run(a.id)
 const settings={...env,INPOST_TOKEN:'fixture',INPOST_ORGANIZATION_ID:'123'}
 const body={confirmCost:true,firstName:'Test',lastName:'Person',phone:'500000000',street:'Testowa',buildingNumber:'1',city:'Warszawa',postalCode:'00-001',length:300,width:200,height:100,weightGrams:1000}
 const s=scheduleShipment(db,a.id,body,'owner',settings);assert.equal(scheduleShipment(db,a.id,body,'owner',settings).replayed,true)
 let target;const adapter=carrier(settings,async(url,init)=>{target=url;assert.equal(JSON.parse(init.body).reference,a.id);return new Response(JSON.stringify({id:12,status:'created'}))})
 await createShipment(db,s.id,settings,adapter);assert.match(target,/sandbox-api-shipx-pl/)
 await refreshShipment(db,s.id,settings,{get:async()=>({id:12,reference:a.id,status:'confirmed',tracking_number:'123456'})})
 assert.equal(db.prepare('SELECT tracking_number FROM shipments').get().tracking_number,'123456')
 assert.throws(()=>carrier({...settings,INPOST_ENV:'production'}),e=>e.status===503)
 assert.equal(db.prepare('SELECT payment_status FROM orders').get().payment_status,'not_requested')
}))
test('OpenAPI exposes stable versioned paths and cookie/bearer security schemes',()=>httpFixture(async({request})=>{
 const r=await request('/api/v1/openapi.json');assert.equal(r.status,200);assert.equal(r.data.openapi,'3.1.0')
 assert.equal(r.data.paths['/service/orders/{id}/decision'].post.requestBody.content['application/json'].schema.$ref,'#/components/schemas/Decision')
 assert.deepEqual(r.data.paths['/admin/service/staff'].post.security,[{staffSession:[]}])
}))
test('Backups include detached media and verified restore rebuilds a separate empty media store',()=>dbFixture(async db=>{
 const dir=await mkdtemp(join(tmpdir(),'mariano-full-restore-'))
 try{
  const bytes=await sharp({create:{width:8,height:8,channels:3,background:'#eee'}}).png().toBuffer()
  const asset=await saveAsset(db,{data:bytes.toString('base64'),mime:'image/png'})
  const settings={...env,MEDIA_DIR:join(dir,'original'),BACKUP_KEY:randomBytes(32).toString('hex'),BACKUP_BUCKET:'private-backup'}
  await migrateAsset(db,asset.id,settings)
  const objects=new Map(),storage={async send(command){const input=command.input;if(command.constructor.name==='PutObjectCommand'){objects.set(input.Key,Buffer.from(input.Body));return {}}if(!objects.has(input.Key))throw Object.assign(Error('Missing'),{name:'NoSuchKey'});return {Body:{transformToByteArray:async()=>objects.get(input.Key)}}}}
  const result=await runBackup(db,settings,storage)
  assert.equal(result.media,2)
  const snapshot=join(dir,'snapshot.enc'),manifest=join(dir,'manifest.enc')
  await writeFile(snapshot,objects.get(result.key));await writeFile(manifest,objects.get(result.key+'.media.enc'))
  const target=join(dir,'restored.sqlite');await restoreBackup(snapshot,target,settings.BACKUP_KEY)
  const restoredSettings={...settings,MEDIA_DIR:join(dir,'restored-media')}
  assert.equal((await restoreMedia(manifest,restoredSettings,storage)).files,2)
  const restored=openDatabase(target)
  try{const row=restored.prepare('SELECT * FROM assets WHERE id=?').get(asset.id);assert.equal(digest((await assetData(row,restoredSettings)).bytes),row.checksum)}finally{restored.close()}
  // Repeating a restore verifies existing files without destructive replacement.
  assert.equal((await restoreMedia(manifest,restoredSettings,storage)).files,2)
 }finally{await rm(dir,{recursive:true,force:true})}
}))
