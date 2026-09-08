import {deliverMail} from './mail.mjs'
import {runBackup} from './backup.mjs'
import {audit} from './security.mjs'
export async function operationsTick(db,env=process.env){
 db.prepare('DELETE FROM tracking_tokens WHERE expires<?').run(Date.now())
 db.prepare('DELETE FROM newsletter_tokens WHERE expires<?').run(Date.now())
 db.prepare('DELETE FROM admin_sessions WHERE expires<? OR touched<?').run(Date.now(),Date.now()-1800000)
 let backupFailed=false
 await deliverMail(db,env)
 if(env.BACKUP_BUCKET&&env.BACKUP_KEY){
  let last
  try{last=JSON.parse(db.prepare("SELECT value FROM operations WHERE key='backup_verified'").get()?.value||'null')}catch{}
  const due=!last||Date.now()-Date.parse(last.at)>Number(env.BACKUP_INTERVAL_HOURS||24)*3600000
  if(due)try{await runBackup(db,env)}catch{backupFailed=true;audit(db,'backup_failed')}
 }
 if(env.ALERT_WEBHOOK_URL){
  if(!env.ALERT_WEBHOOK_URL.startsWith('https://'))throw Error('Alert webhook requires HTTPS')
  const since=Number(db.prepare("SELECT value FROM operations WHERE key='alert_cursor'").get()?.value||0)
  const events=db.prepare("SELECT id,event FROM audit_events WHERE id>? AND event IN ('server_error','mail_failed','worker_failed','backup_failed','rate_limited','owner_login_failed') ORDER BY id LIMIT 100").all(since)
  if(events.length){
   const counts=Object.fromEntries([...new Set(events.map(e=>e.event))].map(event=>[event,events.filter(e=>e.event===event).length]))
   const response=await fetch(env.ALERT_WEBHOOK_URL,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',...(env.ALERT_WEBHOOK_TOKEN?{Authorization:'Bearer '+env.ALERT_WEBHOOK_TOKEN}:{})},body:JSON.stringify({service:'mariano',events:counts}),signal:AbortSignal.timeout(10000)})
   if(!response.ok)throw Error('Alert receiver unavailable')
   db.prepare('INSERT INTO operations VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('alert_cursor',String(events.at(-1).id))
  }
 }
 if(backupFailed)throw Error('Backup unavailable')
 db.prepare('INSERT INTO operations VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('worker_last_ok',new Date().toISOString())
}
export function startWorker(db,env=process.env){
 let active=null,lastFailure=0
 const tick=()=>{if(active||Date.now()-lastFailure<300000)return;active=operationsTick(db,env).catch(()=>{lastFailure=Date.now();audit(db,'worker_failed');db.prepare('INSERT INTO operations VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('worker_last_failure',new Date().toISOString())}).finally(()=>{active=null})}
 const timer=setInterval(tick,30000);timer.unref();tick()
 return async()=>{clearInterval(timer);await active}
}
