import {randomUUID,createHash} from 'node:crypto'
import seed from '../shared/editorial.json' with {type:'json'}
import catalog from '../shared/catalog.json' with {type:'json'}
import {HttpError,record,textField,emailField} from './commerce.mjs'
import {validMediaPath,saveProduct} from './catalog.mjs'
import {owner,permit,limit,digest} from './security.mjs'
import {transaction,history} from './service.mjs'
import {newsletterMail} from './mail.mjs'

const legacyCopy={"botanika":{"summary":"Szeroka nogawka, naturalne płótno i roślinny ślad w kobalcie.","detail":"Motyw odbijany osobno na każdym fragmencie tkaniny. Drobne różnice w nasyceniu są częścią projektu.","leadTime":"10–15 dni roboczych"},"gest":{"summary":"Granatowe płótno. Jasna linia prowadzona bez pośpiechu.","detail":"Swobodny krój i szeroki ślad pędzla. Układ dekoracji może różnić się między parami.","leadTime":"10–15 dni roboczych"},"forma":{"summary":"Naturalny len i kompozycja w kolorze gliny i błękitu.","detail":"Prosty krój pozostawia miejsce na strukturę lnu. Każdy kształt nanoszony jest oddzielnie.","leadTime":"10–15 dni roboczych"}}
export function migrateEditorial(db){
 if(db.prepare('SELECT 1 FROM schema_migrations WHERE version=4').get())return
 transaction(db,()=>{
  db.exec(`CREATE TABLE editorial(id TEXT PRIMARY KEY,kind TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,draft TEXT NOT NULL,live TEXT,pending TEXT,pending_at TEXT,revision INTEGER NOT NULL DEFAULT 1,deleted INTEGER NOT NULL DEFAULT 0);
   CREATE TABLE editorial_history(id INTEGER PRIMARY KEY,document_id TEXT NOT NULL REFERENCES editorial(id),revision INTEGER NOT NULL,snapshot TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,created_at TEXT NOT NULL);
   CREATE INDEX editorial_history_document ON editorial_history(document_id,id);
   CREATE TABLE drop_interest(drop_id TEXT NOT NULL REFERENCES editorial(id),email TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(drop_id,email));
   CREATE TABLE product_versions(id INTEGER PRIMARY KEY,slug TEXT NOT NULL REFERENCES products(slug),revision INTEGER NOT NULL,snapshot TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(slug,revision));`)
  for(const data of seed){const text=JSON.stringify(data);db.prepare('INSERT INTO editorial(id,kind,slug,draft,live) VALUES(?,?,?,?,?)').run(data.id,data.kind,data.slug,text,text)}
  // Change the production model without overwriting owner prices, media or custom copy.
  for(const p of catalog){
   const row=db.prepare('SELECT data,revision FROM products WHERE slug=?').get(p.slug)
   if(!row)continue
   const old=JSON.parse(row.data),next={...old,madeToOrder:false,productionCountry:'Bangladesz'}
   for(const key of ['summary','detail','leadTime'])if(old[key]===legacyCopy[p.slug]?.[key])next[key]=p[key]
   if(JSON.stringify(next)!==row.data){
    const now=new Date().toISOString()
    db.prepare('INSERT INTO product_versions(slug,revision,snapshot,created_at) VALUES(?,?,?,?)').run(p.slug,row.revision,row.data,now)
    db.prepare('UPDATE products SET data=?,revision=revision+1 WHERE slug=?').run(JSON.stringify(next),p.slug)
    db.prepare('INSERT INTO product_versions(slug,revision,snapshot,created_at) VALUES(?,?,?,?)').run(p.slug,row.revision+1,JSON.stringify(next),now)
   }
  }
  db.exec('INSERT INTO schema_migrations VALUES(4)')
 })
}
const choice=(v,values,fallback)=>values.includes(v)?v:fallback
const text=(v,key,max=160)=>textField(v??'',key,0,max)
const number=(v,min,max,fallback)=>v===undefined?fallback:Number.isFinite(v)&&v>=min&&v<=max?v:(()=>{throw new HttpError(400,'Wartość poza zakresem.')})()
function date(value){if(!value)return '';if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT/.test(value)||!Number.isFinite(Date.parse(value)))throw new HttpError(400,'Nieprawidłowa data.');return new Date(value).toISOString()}
export function safeHref(value){if(!value)return '';if(typeof value!=='string'||!/^\/(?!\/)[a-zA-Z0-9/?=&_%#.-]*$/.test(value)||value.includes('..'))throw new HttpError(400,'Link musi prowadzić do strony w tym sklepie.');return value}
function media(db,value,video=false){value=value||'';if(!validMediaPath(value,video))throw new HttpError(400,'Wybierz plik z biblioteki sklepu.');if(value.startsWith('/media/uploads/')&&!db.prepare('SELECT 1 FROM assets WHERE id=? AND order_id IS NULL AND mime=?').get(value.split('/').pop().split('.')[0],video?'video/mp4':'image/webp'))throw new HttpError(400,'Plik nie jest publiczny.');return value}
function products(db,values){if(!Array.isArray(values)||values.length>100)throw new HttpError(400,'Wybierz do 100 produktów.');return [...new Set(values.map(v=>{if(typeof v!=='string'||!db.prepare('SELECT 1 FROM products WHERE slug=?').get(v))throw new HttpError(400,'Nieznany produkt.');return v}))]}
export function validateEditorial(db,input,kind='drop'){
 record(input);const slug=textField(input.slug,'slug',1,80);if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new HttpError(400,'Adres: małe litery, cyfry i myślniki.')
 const result={kind,slug,title:textField(input.title,'title',1,100),eyebrow:text(input.eyebrow,'eyebrow',80),description:text(input.description,'description',400),badge:text(input.badge,'badge',40),image:media(db,input.image),mobileImage:media(db,input.mobileImage),video:media(db,input.video,true),alt:text(input.alt,'alt',300),ctaLabel:text(input.ctaLabel,'ctaLabel',40),ctaHref:safeHref(input.ctaHref),seoTitle:text(input.seoTitle,'seoTitle',100),seoDescription:text(input.seoDescription,'seoDescription',200),theme:choice(input.theme,['dark','light'],'dark'),layout:choice(input.layout,['split','grid','wide'],'split'),height:choice(input.height,['full','large','compact'],'large'),align:choice(input.align,['left','center','right'],'left'),overlay:number(input.overlay,0,80,30),focalX:number(input.focalX,0,100,50),focalY:number(input.focalY,0,100,50),position:number(input.position,0,999,0),productSlugs:products(db,input.productSlugs||[]),launchAt:date(input.launchAt),endsAt:date(input.endsAt)}
 for(const key of ['enabled','showHome','showDate','showCountdown','showProducts','showWaitlist','showArchive'])result[key]=input[key]===undefined?!['showWaitlist'].includes(key):input[key]===true
 if(result.endsAt&&(!result.launchAt||result.endsAt<=result.launchAt))throw new HttpError(400,'Koniec dropu musi być po premierze.')
 if(result.image&&!result.alt)throw new HttpError(400,'Dodaj opis zdjęcia.')
 if(!Array.isArray(input.sections||[])||(input.sections||[]).length>24)throw new HttpError(400,'Maksymalnie 24 sekcje.')
 const ids=new Set()
 result.sections=(input.sections||[]).map(s=>{record(s);const id=textField(s.id,'id',1,80);if(ids.has(id))throw new HttpError(400,'Powtórzona sekcja.');ids.add(id);const image=media(db,s.image),alt=text(s.alt,'alt',300);if(image&&!alt)throw new HttpError(400,'Dodaj opis zdjęcia sekcji.');return {id,type:choice(s.type,['text','image','products','drops','cloth'],'text'),title:text(s.title,'title',100),text:text(s.text,'text',800),image,mobileImage:media(db,s.mobileImage),alt,ctaLabel:text(s.ctaLabel,'ctaLabel',40),ctaHref:safeHref(s.ctaHref),theme:choice(s.theme,['light','dark'],'light'),enabled:s.enabled!==false,limit:number(s.limit,1,12,4),productSlugs:products(db,s.productSlugs||[])}})
 return result
}
function effective(row,now){return row.pending&&row.pending_at<=now?row.pending:row.live}
export function publicEditorial(db,now=new Date().toISOString()){
 const documents=db.prepare('SELECT * FROM editorial WHERE deleted=0').all().flatMap(row=>{const raw=effective(row,now);if(!raw)return [];const d=JSON.parse(raw);if(d.enabled===false)return [];return [{...d,sections:d.sections.filter(s=>s.enabled!==false),id:row.id,kind:row.kind,phase:d.endsAt&&d.endsAt<=now?'ended':d.launchAt&&d.launchAt>now?'upcoming':'live'}]})
 return {documents:documents.sort((a,b)=>(a.position||0)-(b.position||0)),serverTime:now}
}
export function saveEditorial(db,id,body,actor){
 return transaction(db,()=>{
  let row=id?db.prepare('SELECT * FROM editorial WHERE id=?').get(id):null
  if(id&&!row)throw new HttpError(404,'Nie znaleziono dokumentu.')
  if(row&&body.revision!==row.revision)throw new HttpError(409,'Inna osoba zmieniła ten dokument. Wczytaj aktualną wersję.')
  const action=body.action||'save'
  if(!['save','publish','schedule','cancel','unpublish','delete','restore'].includes(action))throw new HttpError(400,'Nieznana operacja.')
  if(!row&&action!=='save')throw new HttpError(400,'Najpierw zapisz wersję roboczą.')
  let data
  if(action==='restore'){
   const revision=db.prepare('SELECT snapshot FROM editorial_history WHERE document_id=? AND id=?').get(id,body.historyId)
   if(!revision)throw new HttpError(404,'Brak wersji.')
   data=validateEditorial(db,JSON.parse(revision.snapshot),row.kind)
  }else data=validateEditorial(db,body.document??(row?JSON.parse(row.draft):{}),row?.kind||'drop')
  if(row?.kind==='page'&&data.slug!==row.slug)throw new HttpError(400,'Adres strony systemowej jest stały.')
  if(db.prepare('SELECT id FROM editorial WHERE slug=? AND id!=?').get(data.slug,id||''))throw new HttpError(409,'Ten adres jest już używany.')
  if(action==='delete'&&row.kind==='page')throw new HttpError(400,'Stronę systemową można ukryć, ale nie usunąć.')
  id=id||randomUUID();const serialized=JSON.stringify(data),now=new Date().toISOString(),revision=(row?.revision||0)+1
  let live=row?effective(row,now):null,pending=row?.pending_at>now?row.pending:null,pendingAt=pending?row.pending_at:null,deleted=row?.deleted||0
  if(action==='publish'){live=serialized;pending=null;pendingAt=null;deleted=0}
  if(action==='schedule'){pendingAt=date(body.publishAt);if(!pendingAt||pendingAt<=now)throw new HttpError(400,'Wybierz przyszłą datę publikacji.');pending=serialized;deleted=0}
  if(['cancel','unpublish','delete'].includes(action)){pending=null;pendingAt=null}
  if(['unpublish','delete'].includes(action))live=null
  if(action==='delete')deleted=1
  if(action==='restore')deleted=0
  if(row&&!db.prepare('SELECT 1 FROM editorial_history WHERE document_id=?').get(id))db.prepare('INSERT INTO editorial_history(document_id,revision,snapshot,actor,action,created_at) VALUES(?,?,?,?,?,?)').run(id,row.revision,row.draft,actor,'initial',now)
  if(row)db.prepare('UPDATE editorial SET slug=?,draft=?,live=?,pending=?,pending_at=?,revision=?,deleted=? WHERE id=?').run(data.slug,serialized,live,pending,pendingAt,revision,deleted,id)
  else db.prepare('INSERT INTO editorial(id,kind,slug,draft,revision) VALUES(?,?,?,?,?)').run(id,'drop',data.slug,serialized,revision)
  db.prepare('INSERT INTO editorial_history(document_id,revision,snapshot,actor,action,created_at) VALUES(?,?,?,?,?,?)').run(id,revision,serialized,actor,action,now)
  history(db,actor,'editorial_'+action,id)
  return {id,revision}
 })
}
export async function editorialRoutes({db,env,config,req,res,url,json,bodyOf}){
 const path=url.pathname
 if(path==='/api/editorial'&&req.method==='GET'){
  const data=publicEditorial(db),etag='"'+createHash('sha256').update(JSON.stringify(data.documents)).digest('hex')+'"'
  res.setHeader('ETag',etag)
  if(req.headers['if-none-match']===etag){res.writeHead(304,{'Cache-Control':'no-cache'});res.end();return true}
  json(res,200,data);return true
 }
 const interest=path.match(/^\/api\/drops\/([a-f0-9-]+)\/interest$/)
 if(interest&&req.method==='POST'){
  const document=publicEditorial(db).documents.find(d=>d.id===interest[1]&&d.kind==='drop'&&d.showWaitlist&&d.phase!=='ended')
  if(!document)throw new HttpError(404,'Zapisy nie są dostępne.')
  const body=await bodyOf(req),email=emailField(body.email);if(body.consent!==true)throw new HttpError(400,'Potwierdź zgodę na wiadomości o kolekcjach.')
  limit(db,'drop-interest:'+digest(email),5,3600000)
  transaction(db,()=>{db.prepare('INSERT INTO drop_interest VALUES(?,?,?) ON CONFLICT DO NOTHING').run(document.id,email,new Date().toISOString());db.prepare('INSERT INTO newsletter_requests(email,created_at,policy_version,consent_text,demo) VALUES(?,?,?,?,?) ON CONFLICT DO NOTHING').run(email,new Date().toISOString(),config.policyVersion,'Chcę otrzymywać wiadomości o kolekcjach Mariano, w tym wybranym dropie.',Number(config.demo));if(db.prepare('SELECT status FROM newsletter_requests WHERE email=?').get(email).status!=='confirmed')newsletterMail(db,env,email,'confirm')})
  json(res,201,{saved:true,emailEnabled:Boolean(env.SMTP_HOST&&env.DATA_KEY)});return true
 }
 if(!path.startsWith('/api/admin/editorial'))return false
 const session=owner(db,req,req.method==='POST',env);permit(session,['owner'])
 const productHistory=path.match(/^\/api\/admin\/editorial\/products\/([a-z0-9-]+)(\/restore)?$/)
 if(productHistory&&req.method==='GET'&&!productHistory[2]){json(res,200,{history:db.prepare('SELECT id,revision,created_at FROM product_versions WHERE slug=? ORDER BY revision DESC LIMIT 50').all(productHistory[1])});return true}
 if(productHistory&&req.method==='POST'&&productHistory[2]){const body=await bodyOf(req),snapshot=db.prepare('SELECT snapshot FROM product_versions WHERE slug=? AND id=?').get(productHistory[1],body.historyId);if(!snapshot)throw new HttpError(404,'Brak wersji produktu.');const result=saveProduct(db,productHistory[1],{...JSON.parse(snapshot.snapshot),revision:body.revision});history(db,session.actor_id,'product_restored',productHistory[1]);json(res,200,result);return true}
 if(path==='/api/admin/editorial'&&req.method==='GET'){
  json(res,200,{documents:db.prepare('SELECT * FROM editorial ORDER BY kind,slug').all().map(r=>({...r,draft:JSON.parse(r.draft),live:r.live?JSON.parse(r.live):null,pending:r.pending?JSON.parse(r.pending):null,interested:db.prepare("SELECT count(*) AS n FROM drop_interest d JOIN newsletter_requests n ON n.email=d.email WHERE d.drop_id=? AND n.status='confirmed'").get(r.id).n})),history:db.prepare('SELECT id,document_id,revision,actor,action,created_at FROM editorial_history ORDER BY id DESC LIMIT 200').all(),media:db.prepare('SELECT id,mime,created_at FROM assets WHERE order_id IS NULL ORDER BY created_at DESC LIMIT 200').all().map(a=>({...a,src:'/media/uploads/'+a.id+(a.mime==='video/mp4'?'.mp4':'.webp')}))});return true
 }
 if(req.method==='POST'&&(path==='/api/admin/editorial'||/^\/api\/admin\/editorial\/[a-z0-9-]+$/.test(path))){const body=await bodyOf(req,128*1024);json(res,200,saveEditorial(db,path==='/api/admin/editorial'?null:path.split('/').pop(),body,session.actor_id));return true}
 throw new HttpError(404,'Brak endpointu.')
}
