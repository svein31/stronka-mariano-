import {HttpError} from './commerce.mjs'
import {owner,permit,limit} from './security.mjs'
import {canTrack,tracking} from './workshop.mjs'
import {center,offerSpecification,decideSpecification,message,convertCustom,inventory,stockChange,reserveMaterials,settleMaterials,capacity,planTask,transaction,history,dateField} from './service.mjs'
import {enqueueJob} from './jobs.mjs'
import {scheduleShipment,reconcileShipment,carrier} from './shipping.mjs'
export async function serviceRoutes({db,env,config,req,res,url,json,bodyOf}){
 const path=url.pathname,write=req.method==='POST'
 const customer=path.match(/^\/api\/service\/orders\/([a-f0-9-]+)(?:\/(decision|messages))?$/)
 if(customer){
  canTrack(db,customer[1],req.headers.authorization?.replace(/^Bearer /,''))
  if(!write&&req.method==='GET'&&!customer[2]){json(res,200,{...tracking(db,customer[1],req.headers.authorization?.replace(/^Bearer /,'')),...center(db,customer[1])});return true}
  if(write&&customer[2]){limit(db,'customer-message:'+customer[1],20,600000);const body=await bodyOf(req);json(res,200,customer[2]==='decision'?decideSpecification(db,customer[1],body,env):message(db,customer[1],body,'customer',env));return true}
  throw new HttpError(405,'Niedozwolona metoda.')
 }
 if(!path.startsWith('/api/admin/service'))return false
 const session=owner(db,req,write,env),actor=session.actor_id
 if(path==='/api/admin/service'&&req.method==='GET'){
  const from=url.searchParams.get('from')||new Date().toISOString().slice(0,10),to=url.searchParams.get('to')||new Date(Date.now()+31*86400000).toISOString().slice(0,10)
  dateField(from);dateField(to);if(to<from||Date.parse(to)-Date.parse(from)>92*86400000)throw new HttpError(400,'Wybierz zakres do 93 dni.')
  const data={role:session.role,actorId:actor,materials:inventory(db),days:db.prepare("SELECT d.day,d.capacity,COALESCE(SUM(CASE WHEN t.status!='cancelled' THEN t.minutes ELSE 0 END),0) AS used FROM production_days d LEFT JOIN production_tasks t ON t.day=d.day WHERE d.day BETWEEN ? AND ? GROUP BY d.day ORDER BY d.day").all(from,to),tasks:db.prepare('SELECT * FROM production_tasks WHERE day BETWEEN ? AND ? ORDER BY day,id LIMIT 500').all(from,to),taskCount:db.prepare('SELECT count(*) AS n FROM production_tasks WHERE day BETWEEN ? AND ?').get(from,to).n,staff:db.prepare('SELECT id,name,role,active,revision FROM staff ORDER BY name').all()}
  if(session.role==='owner')Object.assign(data,{jobs:db.prepare('SELECT id,kind,status,attempts,available,last_error FROM jobs ORDER BY created_at DESC LIMIT 100').all(),history:db.prepare('SELECT * FROM change_history ORDER BY id DESC LIMIT 100').all(),media:{backend:env.MEDIA_BUCKET?'s3':'disk',bytes:db.prepare('SELECT COALESCE(SUM(byte_size),0) AS n FROM assets').get().n,pending:db.prepare('SELECT count(*) AS n FROM assets WHERE storage_key IS NULL').get().n}})
  json(res,200,data);return true
 }
 const order=path.match(/^\/api\/admin\/service\/orders\/([a-f0-9-]+)(?:\/(specifications|messages|reservations|materials|shipment))?$/)
 if(order&&req.method==='GET'&&!order[2]){json(res,200,{...center(db,order[1]),reservations:db.prepare('SELECT * FROM reservations WHERE order_id=?').all(order[1]),shipment:db.prepare('SELECT id,provider,provider_id,tracking_number,status,updated_at,environment FROM shipments WHERE order_id=?').get(order[1])||null});return true}
 const label=path.match(/^\/api\/admin\/service\/shipments\/([a-f0-9-]+)\/label$/)
 if(label&&req.method==='GET'){
  permit(session,['owner','support']);const row=db.prepare('SELECT * FROM shipments WHERE id=?').get(label[1]);if(!row?.provider_id)throw new HttpError(409,'Etykieta nie jest jeszcze dostępna.')
  if(row.environment!==(env.INPOST_ENV==='production'?'production':'sandbox'))throw new HttpError(409,'Sprawdź środowisko InPost.')
  const pdf=await carrier(env).label(row.provider_id);res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="etykieta.pdf"','Cache-Control':'no-store'});res.end(pdf);return true
 }
 if(!write)throw new HttpError(404,'Brak endpointu.')
 const body=await bodyOf(req,65536)
 if(order){
  let result
  if(order[2]==='specifications'){permit(session,['owner','support']);result=offerSpecification(db,order[1],body,actor,env)}
  else if(order[2]==='messages'){permit(session,['owner','support']);result=message(db,order[1],body,actor,env)}
  else if(order[2]==='reservations'){permit(session,['owner','production']);result=reserveMaterials(db,order[1],body,actor)}
  else if(order[2]==='materials'){permit(session,['owner','production']);result=settleMaterials(db,order[1],body.action,actor)}
  else if(order[2]==='shipment'){permit(session,['owner','support']);result=scheduleShipment(db,order[1],body,actor,env)}
  else throw new HttpError(404,'Brak endpointu.')
  json(res,200,result);return true
 }
 const convert=path.match(/^\/api\/admin\/service\/custom\/([a-f0-9-]+)\/convert$/)
 if(convert){permit(session,['owner','support']);json(res,200,convertCustom(db,convert[1],actor,env,config));return true}
 if(path==='/api/admin/service/stock'){permit(session,['owner','production']);json(res,200,stockChange(db,body,actor));return true}
 if(path==='/api/admin/service/capacity'){permit(session,['owner','production']);json(res,200,capacity(db,body,actor));return true}
 if(path==='/api/admin/service/tasks'){permit(session,['owner','production']);json(res,200,planTask(db,body,actor));return true}
 const ship=path.match(/^\/api\/admin\/service\/shipments\/([a-f0-9-]+)\/(refresh|reconcile)$/)
 if(ship){permit(session,['owner','support']);if(!db.prepare('SELECT 1 FROM shipments WHERE id=?').get(ship[1]))throw new HttpError(404,'Brak przesyłki.');json(res,200,ship[2]==='reconcile'?await reconcileShipment(db,ship[1],body,actor,env):{id:enqueueJob(db,'shipment_poll','poll:'+ship[1]+':'+Math.floor(Date.now()/60000),{id:ship[1]})});return true}
 permit(session,['owner'])
 if(path==='/api/admin/service/staff'){
  if(!['owner','support','production'].includes(body.role)||typeof body.active!=='boolean')throw new HttpError(400,'Sprawdź rolę i aktywność.')
  json(res,200,transaction(db,()=>{const r=db.prepare('UPDATE staff SET role=?,active=?,revision=revision+1 WHERE id=? AND revision=?').run(body.role,Number(body.active),String(body.id),body.revision);if(!r.changes)throw new HttpError(409,'Konto zmieniło się.');db.prepare('DELETE FROM admin_sessions WHERE actor_id=?').run(String(body.id));history(db,actor,'staff_updated',String(body.id));return {saved:true}}));return true
 }
 if(path==='/api/admin/service/jobs/retry'){
  const job=db.prepare("SELECT * FROM jobs WHERE id=? AND status='failed'").get(String(body.id))
  if(!job)throw new HttpError(404,'Brak nieudanego zadania.')
  if(job.kind==='shipment_create')throw new HttpError(409,'Sprawdź przesyłkę u przewoźnika i przypisz jej identyfikator. Automatyczne ponowienie mogłoby utworzyć drugą etykietę.')
  db.prepare("UPDATE jobs SET status='pending',attempts=0,available=?,last_error=NULL WHERE id=?").run(Date.now(),job.id);history(db,actor,'job_retried',job.id);json(res,200,{saved:true});return true
 }
 throw new HttpError(404,'Brak endpointu.')
}
