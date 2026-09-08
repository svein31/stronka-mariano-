import {randomUUID} from 'node:crypto'
import {transaction} from './service.mjs'
import {audit} from './security.mjs'
export function enqueueJob(db,kind,dedupe,payload={},available=Date.now()){
 const id=randomUUID()
 db.prepare('INSERT INTO jobs(id,kind,dedupe,payload,available,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(dedupe) DO NOTHING').run(id,kind,dedupe,JSON.stringify(payload),available,new Date().toISOString())
 return db.prepare('SELECT id FROM jobs WHERE dedupe=?').get(dedupe).id
}
export async function runJobs(db,handlers,{now=Date.now(),max=5}={}){
 // Atomic claims across API/worker processes. Payloads contain record IDs only.
 db.prepare("UPDATE jobs SET status='failed',last_error='ambiguous_creation',lease=NULL,lease_token=NULL WHERE status='running' AND lease<? AND kind='shipment_create'").run(now)
 db.prepare("UPDATE jobs SET status='pending',lease=NULL,lease_token=NULL WHERE status='running' AND lease<? AND kind!='shipment_create'").run(now)
 for(let i=0;i<max;i++){
  const job=transaction(db,()=>{
   const row=db.prepare("SELECT * FROM jobs WHERE status='pending' AND available<=? ORDER BY available,id LIMIT 1").get(now)
   if(!row)return null
   const leaseToken=randomUUID()
   db.prepare("UPDATE jobs SET status='running',attempts=attempts+1,lease=?,lease_token=? WHERE id=?").run(Date.now()+120000,leaseToken,row.id)
   return {...row,attempts:row.attempts+1,leaseToken}
  })
  if(!job)break
  const heartbeat=setInterval(()=>{try{db.prepare('UPDATE jobs SET lease=? WHERE id=? AND lease_token=?').run(Date.now()+120000,job.id,job.leaseToken)}catch{}},30000);heartbeat.unref()
  try{
   if(!handlers[job.kind])throw Error('Unknown job')
   await handlers[job.kind](JSON.parse(job.payload))
   db.prepare("UPDATE jobs SET status='done',payload='{}',lease=NULL,lease_token=NULL,last_error=NULL WHERE id=? AND lease_token=?").run(job.id,job.leaseToken)
  }catch{
   const failed=job.attempts>=8||job.kind==='shipment_create'
   db.prepare('UPDATE jobs SET status=?,available=?,lease=NULL,lease_token=NULL,last_error=? WHERE id=? AND lease_token=?').run(failed?'failed':'pending',Date.now()+Math.min(3600000,30000*2**job.attempts),job.kind==='shipment_create'?'check_carrier_before_retry':'transport_failed',job.id,job.leaseToken)
   audit(db,'job_failed','',job.kind)
  }finally{clearInterval(heartbeat)}
 }
}
