import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {openDatabase} from '../server/database.mjs'
import {saveEditorial,publicEditorial,validateEditorial} from '../server/editorial.mjs'
import {createApp} from '../server/app.mjs'
import {getConfig} from '../server/config.mjs'
import {digest} from '../server/security.mjs'
import {listProducts,saveProduct} from '../server/catalog.mjs'
const draft={slug:'test-drop',title:'Drop testowy',image:'/media/botanika.webp',alt:'Spodnie testowe',productSlugs:['botanika'],showHome:true,sections:[{id:'intro',type:'text',title:'Projekt',text:'Design tworzony ręcznie.',enabled:true}]}
const fixture=async fn=>{const db=openDatabase(':memory:');try{await fn(db)}finally{db.close()}}
test('Product history retains exact price and media snapshots; stale saves cannot create phantom history',()=>fixture(db=>{
 const before=listProducts(db)[0]
 const next=saveProduct(db,before.slug,{...before,price:61000})
 const history=db.prepare('SELECT * FROM product_versions WHERE slug=? ORDER BY revision').all(before.slug)
 assert.equal(history.length,2);assert.equal(JSON.parse(history[0].snapshot).price,before.price);assert.equal(JSON.parse(history[1].snapshot).price,61000)
 assert.throws(()=>saveProduct(db,before.slug,before),e=>e.status===409)
 assert.equal(db.prepare('SELECT count(*) AS n FROM product_versions').get().n,2)
 const restored=saveProduct(db,before.slug,{...JSON.parse(history[0].snapshot),revision:next.revision})
 assert.equal(restored.price,before.price);assert.equal(restored.madeToOrder,false)
}))
test('Editorial drafts are private; publication uses an immutable snapshot until explicitly republished',()=>fixture(db=>{
 const r=saveEditorial(db,null,{action:'save',document:draft},'owner')
 assert.equal(publicEditorial(db).documents.some(d=>d.id===r.id),false)
 const p=saveEditorial(db,r.id,{revision:r.revision,action:'publish'},'owner')
 saveEditorial(db,r.id,{revision:p.revision,action:'save',document:{...draft,title:'Sekretny szkic'}},'owner')
 assert.equal(publicEditorial(db).documents.find(d=>d.id===r.id).title,draft.title)
 assert.throws(()=>saveEditorial(db,r.id,{revision:p.revision,action:'publish'},'owner'),e=>e.status===409)
}))
test('Scheduling changes the public document exactly at the boundary; later draft edits cannot leak',()=>fixture(db=>{
 const launch=new Date(Date.now()+3600000).toISOString(),r=saveEditorial(db,null,{document:draft},'owner')
 const s=saveEditorial(db,r.id,{revision:r.revision,action:'schedule',publishAt:launch,document:{...draft,title:'Zaplanowany',launchAt:launch}},'owner')
 saveEditorial(db,r.id,{revision:s.revision,document:{...draft,title:'Prywatny'}},'owner')
 assert.equal(publicEditorial(db,new Date(Date.parse(launch)-1).toISOString()).documents.some(d=>d.id===r.id),false)
 const actual=publicEditorial(db,launch).documents.find(d=>d.id===r.id)
 assert.equal(actual.title,'Zaplanowany');assert.equal(actual.phase,'live')
}))
test('Cancel, unpublish, delete and restore keep history and never restore directly to public',()=>fixture(db=>{
 let r=saveEditorial(db,null,{document:draft},'owner')
 r=saveEditorial(db,r.id,{revision:r.revision,action:'publish'},'owner')
 r=saveEditorial(db,r.id,{revision:r.revision,action:'schedule',publishAt:new Date(Date.now()+600000).toISOString(),document:{...draft,title:'Wersja przyszła'}},'owner')
 r=saveEditorial(db,r.id,{revision:r.revision,action:'cancel'},'owner')
 assert.equal(publicEditorial(db).documents.find(d=>d.id===r.id).title,draft.title)
 r=saveEditorial(db,r.id,{revision:r.revision,action:'delete'},'owner')
 assert.equal(publicEditorial(db).documents.some(d=>d.id===r.id),false)
 const history=db.prepare('SELECT id FROM editorial_history WHERE document_id=? ORDER BY id LIMIT 1').get(r.id)
 r=saveEditorial(db,r.id,{revision:r.revision,action:'restore',historyId:history.id},'owner')
 assert.equal(publicEditorial(db).documents.some(d=>d.id===r.id),false)
 assert.equal(db.prepare('SELECT deleted FROM editorial WHERE id=?').get(r.id).deleted,0)
 assert.throws(()=>saveEditorial(db,'home',{revision:1,action:'delete'},'owner'),e=>e.status===400)
}))
test('Editorial validation rejects unsafe links, private media, bad schedules and noncatalog products',()=>fixture(db=>{
 for(const body of [{...draft,ctaHref:'javascript:alert(1)'},{...draft,ctaHref:'//evil.test'},{...draft,image:'/media/uploads/11111111-1111-1111-1111-111111111111.webp'},{...draft,productSlugs:['missing']},{...draft,overlay:100},{...draft,launchAt:'tomorrow'},{...draft,endsAt:'2030-01-01T00:00:00Z'},{...draft,sections:[draft.sections[0],draft.sections[0]]}])assert.throws(()=>validateEditorial(db,body),e=>e.status===400)
 const a=saveEditorial(db,null,{document:draft},'owner')
 assert.throws(()=>saveEditorial(db,null,{document:draft},'owner'),e=>e.status===409)
 assert.throws(()=>saveEditorial(db,a.id,{revision:a.revision,action:'schedule',publishAt:'2000-01-01T00:00:00Z'},'owner'),e=>e.status===400)
 assert.equal(db.prepare('SELECT revision FROM editorial WHERE id=?').get(a.id).revision,a.revision)
}))
test('Public API exposes no drafts; editorial writes require owner authentication, CSRF and origin',()=>fixture(async db=>{
 const env={ADMIN_PASSWORD_HASH:'test-only',ADMIN_EMAIL:'owner@example.test',PUBLIC_ORIGIN:'http://localhost:5173'},secret=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex')
 db.prepare('INSERT INTO admin_sessions VALUES(?,?,?,?,?,?)').run(digest(secret),csrf,Date.now()+60000,Date.now(),digest(env.ADMIN_PASSWORD_HASH),'owner')
 const app=createApp({db,env,config:getConfig(env)});await new Promise(r=>app.listen(0,'127.0.0.1',r))
 const base='http://127.0.0.1:'+app.address().port
 const request=(path,body,headers={})=>fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Origin:env.PUBLIC_ORIGIN,...headers},body:body?JSON.stringify(body):undefined})
 try{
  assert.equal((await request('/api/admin/editorial')).status,401)
  assert.equal((await request('/api/admin/editorial',{document:draft},{Cookie:'mariano_owner='+secret})).status,403)
  assert.equal((await request('/api/admin/editorial',{document:draft},{Cookie:'mariano_owner='+secret,'X-CSRF-Token':csrf,Origin:'https://other.test'})).status,403)
  const saved=await request('/api/admin/editorial',{document:draft},{Cookie:'mariano_owner='+secret,'X-CSRF-Token':csrf});assert.equal(saved.status,200)
  const publicResponse=await request('/api/editorial');const content=await publicResponse.json();assert.equal(content.documents.some(d=>d.slug===draft.slug),false)
  assert.ok(content.documents.every(d=>!('draft' in d)&&!('revision' in d)))
  const cached=await request('/api/editorial',null,{'If-None-Match':publicResponse.headers.get('ETag')});assert.equal(cached.status,304)
  const supportSecret=randomBytes(32).toString('hex')
  db.prepare('INSERT INTO staff(id,email,name,role,password_hash,totp_secret) VALUES(?,?,?,?,?,?)').run('support-test','support@example.test','Support','support','support-hash','support-totp')
  db.prepare('INSERT INTO admin_sessions VALUES(?,?,?,?,?,?)').run(digest(supportSecret),csrf,Date.now()+60000,Date.now(),digest('support-hashsupport-totp'),'support-test')
  assert.equal((await request('/api/admin/editorial',null,{Cookie:'mariano_owner='+supportSecret})).status,403)
  assert.equal((await request('/api/admin/editorial',{document:draft},{Cookie:'mariano_owner='+supportSecret,'X-CSRF-Token':csrf})).status,403)
 }finally{await new Promise(r=>app.close(r))}
}))
