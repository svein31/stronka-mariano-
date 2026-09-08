import {randomUUID} from 'node:crypto'
import sharp from 'sharp'
import {HttpError,textField,emailField,readOrder} from './commerce.mjs'
import {listProducts} from './catalog.mjs'
import {digest} from './security.mjs'
import {notifyOrder,newsletterMail} from './mail.mjs'
import {enqueueJob} from './jobs.mjs'
export const STAGES=['received','confirmed','cutting','sewing','printing','ready','shipped','cancelled']
export function canTrack(db,id,secret){
 if(typeof secret!=='string'||!/^[a-f0-9]{64}$/.test(secret))throw new HttpError(404,'Dostęp wygasł lub jest nieprawidłowy.')
 const row=db.prepare('SELECT order_id FROM tracking_tokens WHERE hash=? AND order_id=? AND expires>? AND revoked=0').get(digest(secret),id,Date.now())
 if(!row)readOrder(db,id,secret)
}
export function tracking(db,id,secret){
 canTrack(db,id,secret)
 const row=db.prepare('SELECT id,stage,estimated_date,created_at,snapshot FROM orders WHERE id=?').get(id)
 if(!row)throw new HttpError(404,'Nie znaleziono zamówienia.')
 return {id:row.id,stage:row.stage,estimatedDate:row.estimated_date,createdAt:row.created_at,products:JSON.parse(row.snapshot).lines.map(l=>({name:l.name,size:l.size,variant:l.variant,quantity:l.quantity})),events:db.prepare('SELECT id,created_at,stage,note,photos FROM order_events WHERE order_id=? ORDER BY created_at,id').all(id).map(e=>({...e,photos:JSON.parse(e.photos)}))}
}
export function updateProgress(db,id,body,env){
 const row=db.prepare('SELECT * FROM orders WHERE id=?').get(id)
 if(!row)throw new HttpError(404,'Brak zamówienia.')
 if(body.revision!==row.revision)throw new HttpError(409,'Zamówienie zmieniło się. Odśwież panel.')
 if(!STAGES.includes(body.stage))throw new HttpError(400,'Nieprawidłowy etap.')
 if(row.stage==='cancelled'&&body.stage!=='cancelled')throw new HttpError(409,'Anulowane zamówienie pozostaje zamknięte.')
 if(body.stage!=='cancelled'&&STAGES.indexOf(body.stage)<STAGES.indexOf(row.stage))throw new HttpError(409,'Nie można cofnąć etapu produkcji.')
 const eta=body.estimatedDate||null
 if(eta&&(!/^\d{4}-\d{2}-\d{2}$/.test(eta)||!Number.isFinite(Date.parse(eta))||new Date(eta).toISOString().slice(0,10)!==eta))throw new HttpError(400,'Nieprawidłowa data.')
 const note=textField(body.note||'','note',0,1200)
 if(!Array.isArray(body.photos)||body.photos.length>6||body.photos.some(p=>!db.prepare("SELECT 1 FROM assets WHERE id=? AND order_id=? AND mime='image/webp'").get(p,id)))throw new HttpError(400,'Nieprawidłowe zdjęcia zamówienia.')
 const eventId=randomUUID()
 db.exec('BEGIN IMMEDIATE')
 try{
  db.prepare('UPDATE orders SET stage=?,estimated_date=?,revision=revision+1,status=? WHERE id=?').run(body.stage,eta,body.stage==='cancelled'?'cancelled':body.stage==='received'?'awaiting_arrangement':'confirmed',id)
  db.prepare('INSERT INTO order_events VALUES(?,?,?,?,?,?)').run(eventId,id,new Date().toISOString(),body.stage,note,JSON.stringify(body.photos))
  if(body.stage==='cancelled'){
   db.prepare("UPDATE reservations SET state='released' WHERE order_id=? AND state='reserved'").run(id)
   db.prepare("UPDATE production_tasks SET status='cancelled',revision=revision+1 WHERE order_id=? AND status='planned'").run(id)
  }
  notifyOrder(db,env,id,body.stage==='shipped'?'Twoja para została wysłana':'Aktualizacja realizacji zamówienia','event:'+eventId)
  db.exec('COMMIT')
 }catch(e){db.exec('ROLLBACK');throw e}
 return {saved:true}
}
export async function saveAsset(db,body,env={}){
 if(typeof body.data!=='string'||body.data.length>18000000||!/^[A-Za-z0-9+/]*={0,2}$/.test(body.data))throw new HttpError(400,'Nieprawidłowy plik (maksymalnie 12 MB).')
 const bytes=Buffer.from(body.data,'base64')
 if(!bytes.length||bytes.length>12*1024*1024)throw new HttpError(400,'Plik jest za duży.')
 const order=body.orderId||null
 if(order&&!db.prepare('SELECT 1 FROM orders WHERE id=?').get(order))throw new HttpError(404,'Brak zamówienia.')
 if(db.prepare('SELECT count(*) AS n FROM assets').get().n>=10000)throw new HttpError(409,'Osiągnięto limit galerii. Skontaktuj się z administratorem.')
 let output,mime,extension
 if(body.mime==='video/mp4'){
  if(order||bytes.subarray(4,8).toString()!=='ftyp')throw new HttpError(400,'Wymagany prawidłowy film MP4 produktu.')
  output=bytes;mime='video/mp4';extension='mp4'
 }else{
  try{const image=sharp(bytes,{limitInputPixels:20000000,animated:false});const meta=await image.metadata();if(!['jpeg','png','webp'].includes(meta.format))throw Error('Unsupported image');output=await image.rotate().resize({width:1800,height:2200,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer()}
  catch{throw new HttpError(400,'Wybierz prawidłowy JPG, PNG lub WebP.')}
  mime='image/webp';extension='webp'
 }
 const id=randomUUID()
 if(db.prepare('SELECT COALESCE(SUM(byte_size),0) AS size FROM assets').get().size+output.length>Number(env.MEDIA_QUOTA_MB||1024)*1024*1024)throw new HttpError(409,'Osiągnięto limit miejsca na media.')
 if(db.prepare('SELECT COALESCE(SUM(length(bytes)),0) AS size FROM assets').get().size+output.length>100*1024*1024)throw new HttpError(503,'Przetwarzanie zdjęć jest opóźnione. Spróbuj po uruchomieniu kolejki.')
 db.exec('BEGIN IMMEDIATE')
 try{db.prepare('INSERT INTO assets(id,mime,bytes,order_id,created_at,byte_size) VALUES(?,?,?,?,?,?)').run(id,mime,output,order,new Date().toISOString(),output.length);enqueueJob(db,'media_store','media:'+id,{id});db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
 return {id,src:order?null:'/media/uploads/'+id+'.'+extension,mime}
}
export function personalize(db,body){
 const product=listProducts(db).find(p=>p.slug===body.slug&&p.available)
 if(!product)throw new HttpError(400,'Projekt jest niedostępny.')
 if(!product.customMaterials.includes(body.material)||!product.customPrints.includes(body.print))throw new HttpError(400,'Wybierz dostępny materiał i nadruk.')
 const details={slug:product.slug,name:textField(body.name,'name',2,100),material:body.material,print:body.print,notes:textField(body.notes||'','notes',0,1500)}
 for(const k of ['inseam','waist','hips']){if(!Number.isFinite(body[k])||body[k]<20||body[k]>250)throw new HttpError(400,'Podaj wymiary w cm.');details[k]=body[k]}
 if(body.acknowledged!==true)throw new HttpError(400,'Potwierdź informację o prywatności.')
 const id=randomUUID()
 db.prepare('INSERT INTO custom_requests(id,created_at,email,details) VALUES(?,?,?,?)').run(id,new Date().toISOString(),emailField(body.email),JSON.stringify(details))
 return {id,status:'awaiting_quote'}
}
export function newsletterAction(db,body,env){
 const row=typeof body.token==='string'&&db.prepare('SELECT * FROM newsletter_tokens WHERE hash=? AND purpose=? AND expires>?').get(digest(body.token),body.purpose,Date.now())
 if(!row||!['confirm','unsubscribe'].includes(body.purpose))throw new HttpError(400,'Link jest nieprawidłowy lub wygasł.')
 db.exec('BEGIN IMMEDIATE')
 try{
  db.prepare('UPDATE newsletter_requests SET status=? WHERE email=?').run(body.purpose==='confirm'?'confirmed':'unsubscribed',row.email)
  db.prepare('DELETE FROM newsletter_tokens WHERE email=? AND purpose=?').run(row.email,body.purpose)
  if(body.purpose==='unsubscribe')db.prepare('DELETE FROM newsletter_tokens WHERE email=?').run(row.email)
  else newsletterMail(db,env,row.email,'unsubscribe')
  db.exec('COMMIT')
 }catch(e){db.exec('ROLLBACK');throw e}
 return {status:body.purpose==='confirm'?'confirmed':'unsubscribed'}
}
