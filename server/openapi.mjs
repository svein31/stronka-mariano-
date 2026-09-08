const string={type:'string'},number={type:'integer'},boolean={type:'boolean'},date={type:'string',format:'date'}
const object=(properties,required=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:false})
const schemas={
 Error:object({error:string,code:string,requestId:{type:'string',format:'uuid'},fields:{type:'object',additionalProperties:string}}),
 Specification:object({previousVersion:number,amount:{type:'integer',minimum:1,description:'PLN grosz'},estimatedDate:date,validDays:{type:'integer',minimum:1,maximum:30},description:string,measurements:string,material:string,delivery:string}),
 Decision:object({specificationId:string,decision:{enum:['accept','changes']},acknowledged:{const:true},note:string},['specificationId','decision','acknowledged']),
 Message:object({content:{type:'string',maxLength:3000},requestKey:{type:'string',minLength:16,maxLength:80}}),
 Stock:object({id:string,name:string,unit:{enum:['cm','piece']},delta:number,note:string,requestKey:string},['delta','note','requestKey']),
 Task:object({id:string,orderId:string,day:date,minutes:number,title:string,assignee:string,status:{enum:['planned','done','cancelled']},revision:number},['orderId','day','minutes','title','status']),
 Capacity:object({day:date,capacity:{type:'integer',minimum:0,maximum:14400}}),
 Reservations:object({items:{type:'array',maxItems:30,items:object({materialId:string,quantity:{type:'integer',minimum:1}})}}),
 Staff:object({id:string,role:{enum:['owner','production','support']},active:boolean,revision:number}),
 Shipment:object({firstName:string,lastName:string,phone:string,street:string,buildingNumber:string,city:string,postalCode:string,length:number,width:number,height:number,weightGrams:number,confirmCost:{const:true}}),
 Login:object({email:{type:'string',format:'email'},password:{type:'string',format:'password'},otp:string},['email','password']),
 Record:{type:'object',additionalProperties:true}
}
const paths={}
function route(path,method,summary,schema,role='public',binary=false){
 const parameters=[...path.matchAll(/\{([^}]+)\}/g)].map(m=>({name:m[1],in:'path',required:true,schema:string}))
 if(role!=='public'&&role!=='customer'&&method==='post')parameters.push({name:'X-CSRF-Token',in:'header',required:true,schema:string})
 const security=role==='customer'?[{trackingToken:[]}]:role==='public'?[]:[{staffSession:[]}]
 const operation={summary,description:'Uprawnienia: '+role+'. Zapis wymaga nagłówka Origin zgodnego z PUBLIC_ORIGIN. Płatności wyłączone.',operationId:method+path.replace(/[^a-zA-Z0-9]/g,'_'),parameters,security,responses:{}}
 if(schema)operation.requestBody={required:true,content:{'application/json':{schema:typeof schema==='string'?{$ref:'#/components/schemas/'+schema}:schema}}}
 operation.responses['200']={description:binary?'Etykieta PDF':'Wynik operacji',content:{[binary?'application/pdf':'application/json']:{schema:binary?{type:'string',format:'binary'}:{$ref:'#/components/schemas/Record'}}}}
 operation.responses['201']={description:'Utworzony rekord'}
 for(const status of ['4XX','5XX'])operation.responses[status]={description:'Błąd operacji',content:{'application/json':{schema:{$ref:'#/components/schemas/Error'}}}}
 paths[path]={...paths[path],[method]:operation}
}
route('/service/orders/{id}','get','Centrum zamówienia, wyceny, wiadomości i przesyłka',null,'customer')
route('/service/orders/{id}/decision','post','Akceptacja konkretnej wersji wyceny','Decision','customer')
route('/service/orders/{id}/messages','post','Wiadomość klienta z deduplikacją','Message','customer')
route('/admin/service','get','Plan dni, zadania, materiały i stan zadań',null,'owner, production, support')
for(const [suffix,schema,roles] of [['specifications','Specification','owner, support'],['messages','Message','owner, support'],['reservations','Reservations','owner, production'],['materials',object({action:{enum:['consume','release']}}),'owner, production'],['shipment','Shipment','owner, support']])route('/admin/service/orders/{id}/'+suffix,'post',suffix,schema,roles)
route('/admin/service/orders/{id}','get','Szczegóły obsługi zamówienia',null,'owner, production, support')
route('/admin/service/custom/{id}/convert','post','Otwórz centrum dla personalizacji','Record','owner, support')
for(const [path,schema,roles] of [['stock','Stock','owner, production'],['capacity','Capacity','owner, production'],['tasks','Task','owner, production'],['staff','Staff','owner'],['jobs/retry',object({id:string}),'owner']])route('/admin/service/'+path,'post',path,schema,roles)
route('/admin/service/shipments/{id}/label','get','Pobierz etykietę PDF',null,'owner, support',true)
route('/admin/service/shipments/{id}/refresh','post','Zleć pobranie statusu','Record','owner, support')
route('/admin/service/shipments/{id}/reconcile','post','Przypisz zweryfikowaną przesyłkę po niejednoznacznym wyniku',object({providerId:string}),'owner, support')
route('/admin/login','post','Logowanie pracownika','Login')
for(const p of ['session','dashboard'])route('/admin/'+p,'get',p,null,'owner, production, support')
route('/admin/logout','post','Wylogowanie','Record','owner, production, support')
for(const p of ['catalog','health','openapi.json'])route('/'+p,'get',p)
for(const p of ['quote','orders','contact','newsletter','tracking-access','personalizations','newsletter/action'])route('/'+p,'post',p,'Record')
for(const p of ['/orders/{id}','/tracking/{id}','/tracking/{id}/photos/{assetId}'])route(p,'get',p,null,'customer')
for(const [p,role] of [['products/{slug}','owner'],['uploads','owner, production'],['orders/{id}/progress','owner, production'],['orders/{id}/revoke','owner, support'],['custom/{id}','owner, support'],['mail/retry','owner']])route('/admin/'+p,'post',p,'Record',role)
route('/admin/assets/{id}','get','Chroniony plik',null,'owner, production, support')
export const openApi={openapi:'3.1.0',info:{title:'Mariano Workshop API',version:'1.0.0',description:'Kwoty w groszach PLN; daty ISO. /api/v1 jest stabilną wersją, istniejące /api pozostaje aliasem. Szczegóły istniejącego checkoutu w API.md.'},servers:[{url:'/api/v1'}],paths,components:{schemas,securitySchemes:{trackingToken:{type:'http',scheme:'bearer',description:'Wygasający klucz konkretnego zamówienia.'},staffSession:{type:'apiKey',in:'cookie',name:'mariano_owner'}}}}
