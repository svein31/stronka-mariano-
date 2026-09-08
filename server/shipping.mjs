import {randomUUID} from 'node:crypto'
import {HttpError,textField,emailField} from './commerce.mjs'
import {transaction,editableOrderForShipping,history,integer} from './shipping-validation.mjs'
import {enqueueJob} from './jobs.mjs'
import {notifyOrder} from './mail.mjs'
export function carrier(env=process.env,fetcher=fetch){
 if(!env.INPOST_TOKEN||!/^\d+$/.test(env.INPOST_ORGANIZATION_ID||''))throw new HttpError(503,'Skonfiguruj konto InPost ShipX.')
 const live=env.INPOST_ENV==='production'
 if(live&&env.INPOST_ALLOW_PAID_LABELS!=='true')throw new HttpError(503,'Włącz zgodę na koszty etykiet po stronie pracowni.')
 const base=live?'https://api-shipx-pl.easypack24.net/v1':'https://sandbox-api-shipx-pl.easypack24.net/v1'
 async function call(path,body,binary=false){
  const r=await fetcher(base+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+env.INPOST_TOKEN,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(20000)})
  if(!r.ok)throw new HttpError(502,'Przewoźnik nie potwierdził operacji. Sprawdź panel przesyłek.')
  if(binary){const data=Buffer.from(await r.arrayBuffer());if(data.length>10*1024*1024||data.subarray(0,5).toString()!=='%PDF-')throw Error('Invalid label');return data}
  return r.json()
 }
 return {create:body=>call('/organizations/'+env.INPOST_ORGANIZATION_ID+'/shipments',body),get:id=>call('/shipments/'+encodeURIComponent(id)),label:id=>call('/shipments/'+encodeURIComponent(id)+'/label?format=pdf&type=A6',null,true)}
}
export function scheduleShipment(db,id,body,actor,env){
 carrier(env)
 return transaction(db,()=>{
  const order=editableOrderForShipping(db,id),existing=db.prepare('SELECT id FROM shipments WHERE order_id=?').get(id)
  if(existing)return {id:existing.id,replayed:true}
  if(body.confirmCost!==true)throw new HttpError(400,'Potwierdź koszty przewoźnika dla pracowni.')
  const customer=JSON.parse(order.customer),phone=textField(body.phone,'phone',9,16)
  if(!/^\+?\d{9,15}$/.test(phone))throw new HttpError(400,'Sprawdź telefon odbiorcy.')
  const request={receiver:{first_name:textField(body.firstName,'firstName',1,60),last_name:textField(body.lastName,'lastName',1,60),email:emailField(customer.email),phone,address:{street:textField(body.street,'street',2,100),building_number:textField(body.buildingNumber,'buildingNumber',1,20),city:textField(body.city,'city',2,100),post_code:textField(body.postalCode,'postalCode',6,6),country_code:'PL'}},parcels:[{dimensions:{length:integer(body.length,10,1500),width:integer(body.width,10,1500),height:integer(body.height,10,1500),unit:'mm'},weight:{amount:integer(body.weightGrams,1,25000)/1000,unit:'kg'},is_non_standard:false}],service:'inpost_courier_standard',reference:id}
  if(!/^\d{2}-\d{3}$/.test(request.receiver.address.post_code))throw new HttpError(400,'Kod pocztowy: 00-000.')
  const shipmentId=randomUUID(),environment=env.INPOST_ENV==='production'?'production':'sandbox'
  db.prepare('INSERT INTO shipments(id,order_id,status,request,updated_at,environment) VALUES(?,?,?,?,?,?)').run(shipmentId,id,'queued',JSON.stringify(request),new Date().toISOString(),environment)
  enqueueJob(db,'shipment_create','shipment:'+shipmentId,{id:shipmentId});history(db,actor,'shipment_requested',id)
  return {id:shipmentId}
 })
}
export async function createShipment(db,id,env,adapter=carrier(env)){
 const row=db.prepare('SELECT * FROM shipments WHERE id=?').get(id)
 if(!row||row.provider_id)return
 if(row.environment!==(env.INPOST_ENV==='production'?'production':'sandbox'))throw Error('Carrier environment changed')
 // Never repeat a request with an ambiguous external result. Reconcile in the carrier panel.
 if(row.status!=='queued')throw Error('Creation needs reconciliation')
 const order=db.prepare('SELECT stage FROM orders WHERE id=?').get(row.order_id)
 if(order?.stage!=='ready')throw Error('Order is no longer ready')
 db.prepare("UPDATE shipments SET status='creating' WHERE id=?").run(id)
 const result=await adapter.create(JSON.parse(row.request))
 if(!/^\d+$/.test(String(result.id||'')))throw Error('Invalid carrier ID')
 db.prepare('UPDATE shipments SET provider_id=?,status=?,tracking_number=?,request=?,updated_at=? WHERE id=?').run(String(result.id),String(result.status||'created'),result.tracking_number||null,'{}',new Date().toISOString(),id)
}
export async function refreshShipment(db,id,env,adapter=carrier(env)){
 const row=db.prepare('SELECT * FROM shipments WHERE id=?').get(id)
 if(!row?.provider_id)return
 if(row.environment!==(env.INPOST_ENV==='production'?'production':'sandbox'))throw Error('Carrier environment changed')
 const result=await adapter.get(row.provider_id)
 if(String(result.id)!==row.provider_id||result.reference!==row.order_id)throw Error('Carrier shipment mismatch')
 transaction(db,()=>{
  db.prepare('UPDATE shipments SET status=?,tracking_number=?,updated_at=? WHERE id=?').run(String(result.status||'unknown').slice(0,80),result.tracking_number||null,new Date().toISOString(),id)
  if(result.status!==row.status)notifyOrder(db,env,row.order_id,'Aktualizacja przesyłki','shipment-status:'+id+':'+String(result.status))
 })
}
export async function reconcileShipment(db,id,body,actor,env){
 const row=db.prepare('SELECT * FROM shipments WHERE id=?').get(id)
 if(!row||row.provider_id||!/^\d+$/.test(String(body.providerId||'')))throw new HttpError(409,'Sprawdź identyfikator przesyłki.')
 if(row.environment!==(env.INPOST_ENV==='production'?'production':'sandbox'))throw new HttpError(409,'Przywróć środowisko przewoźnika zgodne z przesyłką.')
 const result=await carrier(env).get(String(body.providerId))
 if(result.reference!==row.order_id)throw new HttpError(409,'Przesyłka dotyczy innego zamówienia.')
 db.prepare('UPDATE shipments SET provider_id=?,status=?,tracking_number=?,request=?,updated_at=? WHERE id=? AND provider_id IS NULL').run(String(body.providerId),String(result.status),result.tracking_number||null,'{}',new Date().toISOString(),id)
 history(db,actor,'shipment_reconciled',row.order_id);return {saved:true}
}
