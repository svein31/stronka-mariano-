import {randomUUID} from 'node:crypto'
import {HttpError,textField,hash} from './commerce.mjs'
import {notifyOrder} from './mail.mjs'
import {token} from './security.mjs'
export const transaction=(db,fn)=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}
export function history(db,actor,action,id){db.prepare('INSERT INTO change_history(created_at,actor_id,action,entity_id) VALUES(?,?,?,?)').run(new Date().toISOString(),actor,action,id)}
export function dateField(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)throw new HttpError(400,'Podaj prawidłową datę.');return value}
export function integer(value,min,max){if(!Number.isSafeInteger(value)||value<min||value>max)throw new HttpError(400,'Nieprawidłowa liczba.');return value}
export function orderExists(db,id){const row=db.prepare('SELECT * FROM orders WHERE id=?').get(id);if(!row)throw new HttpError(404,'Brak zamówienia.');return row}
const editableOrder=(db,id)=>{const row=orderExists(db,id);if(['shipped','cancelled'].includes(row.stage))throw new HttpError(409,'Zamówienie jest zamknięte.');return row}
export function center(db,id){
 const row=orderExists(db,id)
 return {specifications:db.prepare('SELECT * FROM specifications WHERE order_id=? ORDER BY version DESC').all(id).map(s=>({...s,content:JSON.parse(s.content)})),messages:db.prepare('SELECT id,author,content,created_at FROM order_messages WHERE order_id=? ORDER BY created_at,id LIMIT 500').all(id),shipment:db.prepare('SELECT provider,tracking_number,status,updated_at,environment FROM shipments WHERE order_id=?').get(id)||null,original:JSON.parse(row.snapshot),paymentStatus:row.payment_status}
}
export function offerSpecification(db,id,body,actor,env){
 return transaction(db,()=>{
  const currentOrder=editableOrder(db,id)
  if(!['received','confirmed'].includes(currentOrder.stage))throw new HttpError(409,'Produkcja już trwa. Uzgodnij zmianę przez wiadomości.')
  const latest=db.prepare('SELECT version FROM specifications WHERE order_id=? ORDER BY version DESC LIMIT 1').get(id)?.version||0
  if(body.previousVersion!==latest)throw new HttpError(409,'Wycena zmieniła się. Odśwież dane.')
  const amount=integer(body.amount,1,10000000),estimatedDate=dateField(body.estimatedDate),days=integer(body.validDays,1,30)
  const content={description:textField(body.description,'description',5,4000),measurements:textField(body.measurements||'','measurements',0,1000),material:textField(body.material,'material',2,300),delivery:textField(body.delivery,'delivery',2,500)}
  db.prepare("UPDATE specifications SET status='superseded' WHERE order_id=? AND status='offered'").run(id)
  const specId=randomUUID()
  db.prepare("INSERT INTO specifications(id,order_id,version,content,amount,estimated_date,expires,status,created_at) VALUES(?,?,?,?,?,?,?,'offered',?)").run(specId,id,latest+1,JSON.stringify(content),amount,estimatedDate,Date.now()+days*86400000,new Date().toISOString())
  history(db,actor,'specification_offered',id);notifyOrder(db,env,id,'Nowa wycena czeka na Twoją decyzję','specification:'+specId)
  return {id:specId,version:latest+1}
 })
}
export function decideSpecification(db,id,body,env){
 return transaction(db,()=>{
  const order=editableOrder(db,id),s=db.prepare('SELECT * FROM specifications WHERE order_id=? AND id=?').get(id,String(body.specificationId))
  if(!s)throw new HttpError(404,'Brak wyceny.')
  if(!['accept','changes'].includes(body.decision)||body.acknowledged!==true)throw new HttpError(400,'Potwierdź decyzję i specyfikację.')
  const status=body.decision==='accept'?'accepted':'changes_requested'
  if(s.status===status)return {saved:true,replayed:true}
  if(s.status!=='offered'||s.expires<Date.now())throw new HttpError(409,'Ta wycena jest nieaktualna. Poproś o nową.')
  // Revisions after cutting would invalidate completed work: negotiate them through messages.
  if(!['received','confirmed'].includes(order.stage))throw new HttpError(409,'Produkcja już trwa. Uzgodnij zmianę z pracownią.')
  db.prepare('UPDATE specifications SET status=?,decided_at=? WHERE id=?').run(status,new Date().toISOString(),s.id)
  if(status==='accepted'){
   db.prepare("UPDATE orders SET amount=?,estimated_date=?,status='confirmed',stage='confirmed',revision=revision+1 WHERE id=?").run(s.amount,s.estimated_date,id)
   db.prepare('INSERT INTO order_events VALUES(?,?,?,?,?,?)').run(randomUUID(),id,new Date().toISOString(),'confirmed','Klient zaakceptował specyfikację v'+s.version+'.','[]')
  }
  const note=body.decision==='accept'?'Zaakceptowano specyfikację v'+s.version+'. Płatność nie została pobrana.':textField(body.note,'note',3,2000)
  db.prepare('INSERT INTO order_messages VALUES(?,?,?,?,?,?)').run(randomUUID(),id,'customer',note,new Date().toISOString(),'decision:'+s.id)
  history(db,'customer','specification_'+status,id);notifyOrder(db,env,id,'Zapisaliśmy decyzję dotyczącą wyceny','decision:'+s.id)
  return {saved:true}
 })
}
export function message(db,id,body,actor,env){
 return transaction(db,()=>{
  orderExists(db,id);const key=textField(body.requestKey,'requestKey',16,80),content=textField(body.content,'content',1,3000)
  const author=actor==='customer'?'customer':'workshop'
  const previous=db.prepare('SELECT id,content FROM order_messages WHERE order_id=? AND author=? AND request_key=?').get(id,author,key)
  if(previous){if(previous.content!==content)throw new HttpError(409,'Ta próba zawierała inną wiadomość.');return {id:previous.id,replayed:true}}
  if(db.prepare('SELECT count(*) AS n FROM order_messages WHERE order_id=?').get(id).n>=500)throw new HttpError(409,'Osiągnięto limit rozmowy. Skontaktuj się z pracownią.')
  const msgId=randomUUID();db.prepare('INSERT INTO order_messages VALUES(?,?,?,?,?,?)').run(msgId,id,author,content,new Date().toISOString(),key)
  history(db,actor,'message_added',id)
  if(author==='workshop')notifyOrder(db,env,id,'Pracownia odpowiedziała na Twoją wiadomość','message:'+msgId)
  return {id:msgId}
 })
}
export function convertCustom(db,id,actor,env,config){
 return transaction(db,()=>{
  const custom=db.prepare('SELECT * FROM custom_requests WHERE id=?').get(id)
  if(!custom)throw new HttpError(404,'Brak zapytania.')
  if(custom.order_id)return {id:custom.order_id,replayed:true}
  if(custom.status==='declined')throw new HttpError(409,'Zapytanie zostało odrzucone.')
  const details=JSON.parse(custom.details),orderId=randomUUID(),snapshot={lines:[{slug:details.slug,name:details.slug,size:'Indywidualny',variant:details.material+' / '+details.print,quantity:1,price:0}],shipping:{id:'arrangement',label:'Do uzgodnienia',price:0},subtotal:0,total:0,currency:'PLN',personalization:details}
  db.prepare("INSERT INTO orders(id,idempotency_key,request_hash,access_hash,created_at,status,payment_status,currency,amount,snapshot,customer,policy_version,demo,access_expires) VALUES(?,?,?,?,?,'awaiting_arrangement','not_requested','PLN',0,?,?,?,?,?)").run(orderId,'custom:'+id,hash(id),hash(token()),new Date().toISOString(),JSON.stringify(snapshot),JSON.stringify({name:details.name,email:custom.email,notes:details.notes}),config.policyVersion,Number(config.demo),Date.now()+30*86400000)
  db.prepare("UPDATE custom_requests SET order_id=?,status='in_service' WHERE id=?").run(orderId,id)
  history(db,actor,'custom_converted',orderId);notifyOrder(db,env,orderId,'Twoja personalizacja w centrum zamówienia','custom-center:'+id)
  return {id:orderId}
 })
}
export function inventory(db){return db.prepare("SELECT m.*,COALESCE(SUM(CASE WHEN r.state='reserved' THEN r.quantity ELSE 0 END),0) AS reserved FROM materials m LEFT JOIN reservations r ON r.material_id=m.id GROUP BY m.id ORDER BY m.name").all().map(m=>({...m,available:m.stock-m.reserved}))}
export function stockChange(db,body,actor){return transaction(db,()=>{
 const key=textField(body.requestKey,'requestKey',16,80),previous=db.prepare('SELECT * FROM stock_events WHERE request_key=?').get(key)
 if(previous){const material=db.prepare('SELECT * FROM materials WHERE id=?').get(previous.material_id);if((body.id?previous.material_id!==body.id:material.name!==body.name||material.unit!==body.unit)||previous.delta!==body.delta||previous.note!==body.note?.trim())throw new HttpError(409,'Ta próba miała inne dane.');return {id:previous.material_id,saved:true,replayed:true}}
 const id=body.id||randomUUID(),existing=db.prepare('SELECT * FROM materials WHERE id=?').get(id)
 if(!existing){if(!['cm','piece'].includes(body.unit))throw new HttpError(400,'Wybierz jednostkę.');db.prepare('INSERT INTO materials(id,name,unit,stock) VALUES(?,?,?,0)').run(id,textField(body.name,'name',2,120),body.unit)}
 const item=inventory(db).find(m=>m.id===id),delta=integer(body.delta,-10000000,10000000)
 if(item.stock+delta<item.reserved)throw new HttpError(409,'Nie można usunąć zarezerwowanego materiału.')
 db.prepare('UPDATE materials SET stock=stock+?,revision=revision+1 WHERE id=?').run(delta,id)
 db.prepare('INSERT INTO stock_events VALUES(?,?,?,?,?,?,?)').run(randomUUID(),id,delta,textField(body.note,'note',3,300),actor,new Date().toISOString(),key)
 history(db,actor,'stock_changed',id);return {id}
})}
export function reserveMaterials(db,id,body,actor){return transaction(db,()=>{
 const order=editableOrder(db,id)
 if(order.status!=='confirmed')throw new HttpError(409,'Najpierw potwierdź zamówienie.')
 if(!Array.isArray(body.items)||body.items.length>30)throw new HttpError(400,'Sprawdź materiały.')
 const seen=new Set()
 for(const item of body.items){if(seen.has(item.materialId))throw new HttpError(400,'Powtórzony materiał.');seen.add(item.materialId);integer(item.quantity,1,10000000)}
 if(db.prepare("SELECT 1 FROM reservations WHERE order_id=? AND state='consumed'").get(id))throw new HttpError(409,'Materiały zostały już zużyte.')
 db.prepare("UPDATE reservations SET state='released' WHERE order_id=?").run(id)
 const stock=inventory(db)
 for(const item of body.items){const m=stock.find(m=>m.id===item.materialId);if(!m||m.available<item.quantity)throw new HttpError(409,'Brak wystarczającej ilości materiału.');db.prepare("INSERT INTO reservations VALUES(?,?,?,'reserved') ON CONFLICT(order_id,material_id) DO UPDATE SET quantity=excluded.quantity,state='reserved'").run(id,m.id,item.quantity)}
 history(db,actor,'materials_reserved',id);return {saved:true}
})}
export function settleMaterials(db,id,action,actor){return transaction(db,()=>{
 const order=orderExists(db,id)
 if(!['consume','release'].includes(action))throw new HttpError(400,'Nieprawidłowa operacja.')
 if(action==='consume'&&order.status!=='confirmed')throw new HttpError(409,'Potwierdź zamówienie przed zużyciem materiałów.')
 const rows=db.prepare("SELECT * FROM reservations WHERE order_id=? AND state='reserved'").all(id)
 for(const r of rows){if(action==='consume'){db.prepare('UPDATE materials SET stock=stock-?,revision=revision+1 WHERE id=?').run(r.quantity,r.material_id);db.prepare('INSERT INTO stock_events VALUES(?,?,?,?,?,?,?)').run(randomUUID(),r.material_id,-r.quantity,'Zużycie na zamówienie',actor,new Date().toISOString(),'consume:'+id+':'+r.material_id)}db.prepare('UPDATE reservations SET state=? WHERE order_id=? AND material_id=?').run(action==='consume'?'consumed':'released',id,r.material_id)}
 history(db,actor,'materials_'+action,id);return {saved:true}
})}
export function capacity(db,body,actor){return transaction(db,()=>{
 const day=dateField(body.day),minutes=integer(body.capacity,0,14400),used=db.prepare("SELECT COALESCE(SUM(minutes),0) AS n FROM production_tasks WHERE day=? AND status!='cancelled'").get(day).n
 if(minutes<used)throw new HttpError(409,'Najpierw przeplanuj zadania z tego dnia.')
 db.prepare('INSERT INTO production_days VALUES(?,?) ON CONFLICT(day) DO UPDATE SET capacity=excluded.capacity').run(day,minutes)
 history(db,actor,'capacity_updated',day);return {saved:true}
})}
export function planTask(db,body,actor){return transaction(db,()=>{
 const id=body.id||randomUUID(),previous=db.prepare('SELECT * FROM production_tasks WHERE id=?').get(id)
 if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw new HttpError(400,'Nieprawidłowy identyfikator zadania.')
 if(previous&&body.revision===0&&previous.revision===1&&previous.order_id===body.orderId&&previous.day===body.day&&previous.minutes===body.minutes&&previous.title===body.title?.trim()&&previous.assignee===(body.assignee||null)&&previous.status===body.status)return {id,replayed:true}
 if(previous&&body.revision!==previous.revision)throw new HttpError(409,'Zadanie zmieniło się.')
 if(previous&&previous.order_id!==body.orderId)throw new HttpError(409,'Nie można przepisać zadania na inne zamówienie.')
 if(!['planned','done','cancelled'].includes(body.status))throw new HttpError(400,'Nieprawidłowy stan zadania.')
 if(body.status!=='cancelled')editableOrder(db,body.orderId);else orderExists(db,body.orderId)
 const day=dateField(body.day),minutes=integer(body.minutes,1,14400),available=db.prepare('SELECT capacity FROM production_days WHERE day=?').get(day)?.capacity
 const used=db.prepare("SELECT COALESCE(SUM(minutes),0) AS n FROM production_tasks WHERE day=? AND status!='cancelled' AND id!=?").get(day,id).n
 if(available===undefined||body.status!=='cancelled'&&used+minutes>available)throw new HttpError(409,'Brak miejsca w planie dnia. Ustaw pojemność lub wybierz inny dzień.')
 const assignee=body.assignee||null
 if(assignee&&!db.prepare("SELECT 1 FROM staff WHERE id=? AND active=1 AND role IN ('production','owner')").get(assignee))throw new HttpError(400,'Wybierz aktywną osobę z produkcji.')
 db.prepare('INSERT INTO production_tasks(id,order_id,day,minutes,title,assignee,status) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET day=excluded.day,minutes=excluded.minutes,title=excluded.title,assignee=excluded.assignee,status=excluded.status,revision=production_tasks.revision+1').run(id,body.orderId,day,minutes,textField(body.title,'title',2,200),assignee,body.status)
 history(db,actor,'task_updated',id);return {id}
})}
