import nodemailer from 'nodemailer'
import {randomUUID} from 'node:crypto'
import {token,digest,encrypt,decrypt,audit} from './security.mjs'
export function enqueueMail(db,env,{to,subject,text,dedupe}){
 if(!env.DATA_KEY)return false
 const payload=encrypt(JSON.stringify({to,subject,text}),env.DATA_KEY).toString('base64')
 db.prepare('INSERT OR IGNORE INTO mail_outbox(id,dedupe,payload,available,created_at) VALUES(?,?,?,?,?)').run(randomUUID(),dedupe,payload,Date.now(),new Date().toISOString())
 return true
}
export function trackingLink(db,env,orderId){
 const access=token()
 db.prepare('INSERT INTO tracking_tokens VALUES(?,?,?,0)').run(digest(access),orderId,Date.now()+30*86400000)
 return env.PUBLIC_ORIGIN+'/track#'+orderId+'.'+access
}
export function notifyOrder(db,env,id,kind,dedupe){
 if(!env.DATA_KEY)return false
 if(db.prepare('SELECT 1 FROM mail_outbox WHERE dedupe=?').get(dedupe))return true
 const row=db.prepare('SELECT customer,stage,estimated_date FROM orders WHERE id=?').get(id)
 const link=trackingLink(db,env,id)
 return enqueueMail(db,env,{to:JSON.parse(row.customer).email,subject:kind,text:kind+'\nNumer: '+id+'\nPrzewidywany termin: '+(row.estimated_date||'do uzgodnienia')+'\nSzczegóły i postęp: '+link+'\nDostęp ważny przez 30 dni. Nie pobrano płatności.',dedupe})
}
export function newsletterMail(db,env,email,purpose){
 if(!env.DATA_KEY)return false
 const access=token()
 db.prepare('INSERT INTO newsletter_tokens VALUES(?,?,?,?)').run(digest(access),email,purpose,Date.now()+(purpose==='confirm'?2:365)*86400000)
 const url=env.PUBLIC_ORIGIN+'/newsletter#'+purpose+'.'+access
 return enqueueMail(db,env,{to:email,subject:purpose==='confirm'?'Potwierdź zapis do newslettera':'Zapis potwierdzony',text:purpose==='confirm'?'Kliknij i potwierdź zapis (link ważny 48 godzin): '+url:'Zapis został potwierdzony. Możesz się wypisać: '+url,dedupe:'newsletter:'+purpose+':'+digest(access)})
}
export async function deliverMail(db,env=process.env,transport){
 if(!env.SMTP_HOST||!env.SMTP_USER||!env.SMTP_PASS||!env.MAIL_FROM||!env.DATA_KEY)return {configured:false,sent:0}
 const sender=transport||nodemailer.createTransport({host:env.SMTP_HOST,port:Number(env.SMTP_PORT||587),secure:Number(env.SMTP_PORT||587)===465,requireTLS:true,auth:{user:env.SMTP_USER,pass:env.SMTP_PASS},connectionTimeout:10000,socketTimeout:15000,disableFileAccess:true,disableUrlAccess:true})
 db.prepare("UPDATE mail_outbox SET status='pending' WHERE status='sending' AND lease<?").run(Date.now())
 const rows=db.prepare("SELECT * FROM mail_outbox WHERE status='pending' AND available<=? ORDER BY created_at LIMIT 10").all(Date.now())
 let sent=0
 for(const row of rows){
  const claimed=db.prepare("UPDATE mail_outbox SET status='sending',lease=? WHERE id=? AND status='pending'").run(Date.now()+120000,row.id)
  if(!claimed.changes)continue
  try{
   const payload=JSON.parse(decrypt(Buffer.from(row.payload,'base64'),env.DATA_KEY).toString())
   await sender.sendMail({...payload,from:env.MAIL_FROM,messageId:'<'+row.id+'@'+new URL(env.PUBLIC_ORIGIN).hostname+'>'})
   db.prepare("UPDATE mail_outbox SET status='sent',payload='',lease=NULL WHERE id=?").run(row.id);sent++
  }catch{
   const attempts=row.attempts+1
   db.prepare('UPDATE mail_outbox SET status=?,attempts=?,available=?,lease=NULL WHERE id=?').run(attempts>=8?'failed':'pending',attempts,Date.now()+Math.min(3600000,30000*2**attempts),row.id)
   audit(db,'mail_failed','',row.id)
  }
 }
 return {configured:true,sent}
}

