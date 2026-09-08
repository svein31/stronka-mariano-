import {randomUUID} from 'node:crypto'
import {HttpError,emailField,textField} from './commerce.mjs'
import {listProducts,saveProduct} from './catalog.mjs'
import {owner,login,sessionCookie,limit,digest,audit} from './security.mjs'
import {tracking,canTrack,updateProgress,saveAsset,personalize,newsletterAction} from './workshop.mjs'
import {notifyOrder,enqueueMail} from './mail.mjs'
export function serveAsset(req,res,row){
 const data=Buffer.from(row.bytes),headers={'Content-Type':row.mime,'Cache-Control':row.order_id?'no-store':'public, max-age=86400','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'}
 const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/)
 if(range){
  const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),data.length-1):data.length-1
  if(start>end||start>=data.length){res.writeHead(416,{'Content-Range':'bytes */'+data.length});res.end();return}
  res.writeHead(206,{...headers,'Content-Range':'bytes '+start+'-'+end+'/'+data.length,'Content-Length':end-start+1});res.end(data.subarray(start,end+1));return
 }
 res.writeHead(200,{...headers,'Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data)
}
export async function workshopRoutes({db,env,config,req,res,url,json,bodyOf,requestId}){
 const path=url.pathname,write=req.method==='POST'
 if(path.startsWith('/api/admin/')){
  if(path==='/api/admin/login'&&write){
   const body=await bodyOf(req)
   limit(db,'login-account:'+digest(String(body.email||'').toLowerCase()),8,15*60000)
   try{
    const result=await login(db,body,env)
    res.setHeader('Set-Cookie',sessionCookie(result.secret,config.origin.startsWith('https:')))
    audit(db,'owner_login',requestId)
    json(res,200,{csrf:result.csrf});return true
   }catch(e){audit(db,'owner_login_failed',requestId);throw e}
  }
  const session=owner(db,req,write,env)
  if(path==='/api/admin/session'&&req.method==='GET'){json(res,200,{csrf:session.csrf});return true}
  if(path==='/api/admin/logout'&&write){db.prepare('DELETE FROM admin_sessions WHERE hash=?').run(session.hash);res.setHeader('Set-Cookie',sessionCookie('',config.origin.startsWith('https:'),true));json(res,200,{ok:true});return true}
  if(path==='/api/admin/dashboard'&&req.method==='GET'){
   const orders=db.prepare('SELECT id,created_at,stage,estimated_date,amount,customer,revision FROM orders ORDER BY created_at DESC LIMIT 100').all().map(o=>({...o,customer:JSON.parse(o.customer),events:db.prepare('SELECT * FROM order_events WHERE order_id=? ORDER BY created_at DESC').all(o.id).map(e=>({...e,photos:JSON.parse(e.photos)}))}))
   json(res,200,{products:listProducts(db),orders,custom:db.prepare('SELECT * FROM custom_requests ORDER BY created_at DESC LIMIT 100').all().map(r=>({...r,details:JSON.parse(r.details)})),audit:db.prepare('SELECT * FROM audit_events ORDER BY id DESC LIMIT 30').all(),mail:db.prepare('SELECT status,count(*) AS count FROM mail_outbox GROUP BY status').all(),operations:db.prepare('SELECT * FROM operations').all(),integrations:{email:Boolean(env.SMTP_HOST&&env.SMTP_USER&&env.SMTP_PASS&&env.MAIL_FROM&&env.DATA_KEY),backup:Boolean(env.BACKUP_BUCKET&&env.BACKUP_KEY&&env.AWS_ACCESS_KEY_ID&&env.AWS_SECRET_ACCESS_KEY),mfa:Boolean(env.ADMIN_TOTP_SECRET),alerts:Boolean(env.ALERT_WEBHOOK_URL)}});return true
  }
  const asset=path.match(/^\/api\/admin\/assets\/([a-f0-9-]+)$/)
  if(asset&&req.method==='GET'){const row=db.prepare('SELECT * FROM assets WHERE id=?').get(asset[1]);if(!row)throw new HttpError(404,'Brak pliku.');serveAsset(req,res,row);return true}
  if(!write)throw new HttpError(404,'Brak endpointu.')
  const body=await bodyOf(req,path==='/api/admin/uploads'?18*1024*1024:65536)
  const product=path.match(/^\/api\/admin\/products\/([a-z0-9-]+)$/)
  if(product){const result=saveProduct(db,product[1],body);audit(db,'product_updated',requestId,product[1]);json(res,200,result);return true}
  if(path==='/api/admin/uploads'){json(res,201,await saveAsset(db,body));return true}
  if(path==='/api/admin/mail/retry'){db.prepare("UPDATE mail_outbox SET status='pending',attempts=0,available=? WHERE status='failed'").run(Date.now());audit(db,'mail_retry',requestId);json(res,200,{ok:true});return true}
  const progress=path.match(/^\/api\/admin\/orders\/([a-f0-9-]+)\/progress$/)
  if(progress){const result=updateProgress(db,progress[1],body,env);audit(db,'order_updated',requestId,progress[1]);json(res,200,result);return true}
  const revoke=path.match(/^\/api\/admin\/orders\/([a-f0-9-]+)\/revoke$/)
  if(revoke){
   db.exec('BEGIN IMMEDIATE')
   try{db.prepare('UPDATE orders SET access_revoked=1 WHERE id=?').run(revoke[1]);db.prepare('UPDATE tracking_tokens SET revoked=1 WHERE order_id=?').run(revoke[1]);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
   audit(db,'tracking_revoked',requestId,revoke[1]);json(res,200,{ok:true});return true
  }
  const custom=path.match(/^\/api\/admin\/custom\/([a-f0-9-]+)$/)
  if(custom){
   const row=db.prepare('SELECT * FROM custom_requests WHERE id=?').get(custom[1])
   if(!row)throw new HttpError(404,'Brak zapytania.')
   if(!['quoted','declined'].includes(body.status)||!Number.isSafeInteger(body.amount)||body.amount<0||body.amount>10000000)throw new HttpError(400,'Sprawdź status i wycenę.')
   const note=textField(body.note||'','note',0,2000)
   db.exec('BEGIN IMMEDIATE')
   try{db.prepare('UPDATE custom_requests SET status=?,quoted_amount=? WHERE id=?').run(body.status,body.amount,row.id);enqueueMail(db,env,{to:row.email,subject:'Odpowiedź pracowni na personalizację',text:(body.status==='quoted'?'Proponowana wycena: '+(body.amount/100).toFixed(2)+' PLN. Wymaga Twojego uzgodnienia.':'Nie możemy obecnie przyjąć tej personalizacji.')+'\n'+note,dedupe:'custom:'+row.id+':'+randomUUID()});db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
   audit(db,'custom_quoted',requestId,row.id);json(res,200,{saved:true});return true
  }
  throw new HttpError(404,'Brak endpointu.')
 }
 const track=path.match(/^\/api\/tracking\/([a-f0-9-]+)$/)
 if(track&&req.method==='GET'){json(res,200,tracking(db,track[1],req.headers.authorization?.replace(/^Bearer /,'')));return true}
 const privateAsset=path.match(/^\/api\/tracking\/([a-f0-9-]+)\/photos\/([a-f0-9-]+)$/)
 if(privateAsset&&req.method==='GET'){
  canTrack(db,privateAsset[1],req.headers.authorization?.replace(/^Bearer /,''))
  const row=db.prepare('SELECT * FROM assets WHERE id=? AND order_id=?').get(privateAsset[2],privateAsset[1]);if(!row)throw new HttpError(404,'Brak zdjęcia.');serveAsset(req,res,row);return true
 }
 if(write&&path==='/api/tracking-access'){
  const body=await bodyOf(req),email=emailField(body.email)
  limit(db,'recovery:'+digest(email),3,3600000)
  const row=typeof body.id==='string'&&db.prepare('SELECT id,customer FROM orders WHERE id=?').get(body.id)
  if(row&&JSON.parse(row.customer).email===email)notifyOrder(db,env,row.id,'Nowy dostęp do realizacji zamówienia','recovery:'+randomUUID())
  json(res,200,{message:'Jeżeli dane pasują do zamówienia, wiadomość zostanie wysłana po skonfigurowaniu poczty.'});return true
 }
 if(write&&path==='/api/personalizations'){json(res,201,personalize(db,await bodyOf(req)));return true}
 if(write&&path==='/api/newsletter/action'){json(res,200,newsletterAction(db,await bodyOf(req),env));return true}
 return false
}
