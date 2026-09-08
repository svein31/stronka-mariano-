import assert from 'node:assert/strict'
import {test} from 'node:test'
import {randomBytes,randomUUID} from 'node:crypto'
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {openDatabase} from '../server/database.mjs'
import {digest,encrypt,decrypt,clientIP,limit} from '../server/security.mjs'
import {deliverMail,enqueueMail,newsletterMail} from '../server/mail.mjs'
import {newsletterAction,personalize,saveAsset} from '../server/workshop.mjs'
import {runBackup,restoreBackup} from '../server/backup.mjs'
test('Private payload encryption authenticates ciphertext and rejects wrong keys',()=>{
 const key=randomBytes(32).toString('hex'),plain=Buffer.from('private-access-token')
 const encrypted=encrypt(plain,key)
 assert.equal(encrypted.includes(plain),false);assert.deepEqual(decrypt(encrypted,key),plain)
 const damaged=Buffer.from(encrypted);damaged[20]^=1
 assert.throws(()=>decrypt(damaged,key));assert.throws(()=>decrypt(encrypted,randomBytes(32).toString('hex')))
})
test('SMTP worker sends decrypted messages once, clears sent payloads and retries failures without logging content',async()=>{
 const db=openDatabase(':memory:'),env={DATA_KEY:randomBytes(32).toString('hex'),SMTP_HOST:'fixture.invalid',SMTP_USER:'fixture',SMTP_PASS:'fixture',MAIL_FROM:'sender@example.test',PUBLIC_ORIGIN:'https://example.test'}
 try{
  assert.equal((await deliverMail(db,{})).configured,false)
  enqueueMail(db,env,{to:'recipient@example.test',subject:'Fixture',text:'private contents',dedupe:'first'})
  enqueueMail(db,env,{to:'recipient@example.test',subject:'Fixture',text:'private contents',dedupe:'first'})
  assert.equal(db.prepare('SELECT count(*) AS n FROM mail_outbox').get().n,1)
  assert.equal(db.prepare('SELECT payload FROM mail_outbox').get().payload.includes('private contents'),false)
  const sent=[]
  assert.equal((await deliverMail(db,env,{sendMail:async m=>sent.push(m)})).sent,1)
  assert.equal(sent[0].text,'private contents');assert.equal(db.prepare('SELECT payload FROM mail_outbox').get().payload,'')
  assert.equal((await deliverMail(db,env,{sendMail:async m=>sent.push(m)})).sent,0)
  enqueueMail(db,env,{to:'recipient@example.test',subject:'Retry',text:'do not log',dedupe:'second'})
  await deliverMail(db,env,{sendMail:async()=>{throw Error('do not log')}})
  assert.equal(db.prepare("SELECT attempts FROM mail_outbox WHERE dedupe='second'").get().attempts,1)
  assert.ok(db.prepare('SELECT detail FROM audit_events').all().every(e=>!e.detail.includes('do not log')))
 }finally{db.close()}
})
test('Newsletter confirmation and unsubscribe require expiring one-time tokens',()=>{
 const db=openDatabase(':memory:'),env={DATA_KEY:randomBytes(32).toString('hex'),PUBLIC_ORIGIN:'https://example.test'},email='subscriber@example.test'
 try{
  db.prepare('INSERT INTO newsletter_requests(email,created_at,policy_version,consent_text,demo) VALUES(?,?,?,?,1)').run(email,new Date().toISOString(),'fixture','Fixture consent')
  newsletterMail(db,env,email,'confirm')
  const payload=()=>JSON.parse(decrypt(Buffer.from(db.prepare("SELECT payload FROM mail_outbox ORDER BY created_at DESC,id DESC LIMIT 1").get().payload,'base64'),env.DATA_KEY).toString())
  const confirm=payload().text.match(/#confirm\.([a-f0-9]{64})/)[1]
  assert.equal(newsletterAction(db,{token:confirm,purpose:'confirm'},env).status,'confirmed')
  assert.throws(()=>newsletterAction(db,{token:confirm,purpose:'confirm'},env))
  const rows=db.prepare('SELECT payload FROM mail_outbox').all()
  const unsub=rows.map(r=>JSON.parse(decrypt(Buffer.from(r.payload,'base64'),env.DATA_KEY).toString()).text).find(t=>t.includes('#unsubscribe.')).match(/#unsubscribe\.([a-f0-9]{64})/)[1]
  assert.equal(newsletterAction(db,{token:unsub,purpose:'unsubscribe'},env).status,'unsubscribed')
  assert.equal(db.prepare('SELECT count(*) AS n FROM newsletter_tokens').get().n,0)
  newsletterMail(db,env,email,'confirm');db.prepare('UPDATE newsletter_tokens SET expires=0').run()
  assert.throws(()=>newsletterAction(db,{token:confirm,purpose:'confirm'},env))
 }finally{db.close()}
})
test('Personalization validates model options and measurements and never accepts a client price',()=>{
 const db=openDatabase(':memory:')
 try{
  const body={slug:'botanika',material:'Bawełna',print:'Stempel',name:'Fixture Person',email:'fixture@example.test',waist:80,hips:100,inseam:76,notes:'Custom print',acknowledged:true,price:1}
  const created=personalize(db,body)
  const row=db.prepare('SELECT * FROM custom_requests WHERE id=?').get(created.id)
  assert.equal(row.quoted_amount,null);assert.equal(JSON.parse(row.details).price,undefined)
  assert.throws(()=>personalize(db,{...body,material:'unoffered'}))
  assert.throws(()=>personalize(db,{...body,inseam:999}))
 }finally{db.close()}
})
test('Media upload rejects SVG and arbitrary files',async()=>{
 const db=openDatabase(':memory:')
 try{
  await assert.rejects(saveAsset(db,{data:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64'),mime:'image/svg+xml'}))
  await assert.rejects(saveAsset(db,{data:Buffer.from('not a video').toString('base64'),mime:'video/mp4'}))
 }finally{db.close()}
})
test('Rate limits persist in SQLite and forwarded IPs require an exact trusted proxy',()=>{
 const db=openDatabase(':memory:')
 try{
  limit(db,'fixture',2);limit(db,'fixture',2);assert.throws(()=>limit(db,'fixture',2),e=>e.status===429)
  const req={socket:{remoteAddress:'127.0.0.1'},headers:{'x-real-ip':'198.51.100.2','x-forwarded-for':'203.0.113.1'}}
  assert.equal(clientIP(req,{}),'127.0.0.1')
  assert.equal(clientIP(req,{TRUSTED_PROXIES:'127.0.0.1'}),'198.51.100.2')
  assert.equal(clientIP({...req,headers:{'x-real-ip':'not-an-ip'}},{TRUSTED_PROXIES:'127.0.0.1'}),'127.0.0.1')
 }finally{db.close()}
})
test('Encrypted remote backup is downloaded, restored and checked; restore cannot overwrite an existing database',async()=>{
 const db=openDatabase(':memory:'),dir=await mkdtemp(join(tmpdir(),'backup-fixture-')),env={BACKUP_KEY:randomBytes(32).toString('hex'),BACKUP_BUCKET:'fixture'},objects=new Map()
 const client={send:async command=>{
  if(command.constructor.name==='PutObjectCommand'){objects.set(command.input.Key,Buffer.from(command.input.Body));return {}}
  return {Body:{transformToByteArray:async()=>objects.get(command.input.Key)}}
 }}
 try{
  const result=await runBackup(db,env,client)
  assert.equal(result.counts.products,3);assert.ok(db.prepare("SELECT value FROM operations WHERE key='backup_verified'").get())
  const archive=join(dir,'backup.enc'),target=join(dir,'restored.sqlite')
  await writeFile(archive,objects.get(result.key));assert.equal((await restoreBackup(archive,target,env.BACKUP_KEY)).products,3)
  await assert.rejects(restoreBackup(archive,target,env.BACKUP_KEY),e=>e.code==='EEXIST')
  const damaged=await readFile(archive);damaged[30]^=1;await writeFile(archive,damaged)
  await assert.rejects(restoreBackup(archive,join(dir,'bad.sqlite'),env.BACKUP_KEY))
 }finally{db.close();await rm(dir,{recursive:true,force:true})}
})

