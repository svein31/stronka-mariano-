import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import catalog from '../shared/catalog.json' with {type:'json'}
import commerce from '../shared/commerce.json' with {type:'json'}
import { HttpError, record, textField, emailField, quoteOrder, createOrder, readOrder } from './commerce.mjs'
import {listProducts} from './catalog.mjs'
import {clientIP,limit,digest,audit} from './security.mjs'
import {workshopRoutes,serveAsset} from './routes-workshop.mjs'
import {newsletterMail} from './mail.mjs'
import {serviceRoutes} from './routes-service.mjs'
import {assetData} from './media-store.mjs'
import {openApi} from './openapi.mjs'
import {editorialRoutes} from './editorial.mjs'
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'}
async function bodyOf(req,max=32768) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new HttpError(415,'Wymagany format JSON.')
  const chunks=[]; let size=0
  for await (const chunk of req) { size+=chunk.length; if (size>max) throw new HttpError(413,'Formularz jest zbyt duży.'); chunks.push(chunk) }
  try {return record(JSON.parse(Buffer.concat(chunks).toString('utf8')))} catch(e) {if(e instanceof HttpError) throw e; throw new HttpError(400,'Nieprawidłowy JSON.')}
}
export function createApp({db,config,dist=resolve('dist'),rateLimit=120,env=process.env}) {
  const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value))}
  return createServer({requestTimeout:15000,headersTimeout:10000,maxHeaderSize:16384},async(req,res)=>{
    const requestId=randomUUID()
    res.setHeader('X-Request-ID',requestId)
    res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()')
    if(config.origin.startsWith('https:'))res.setHeader('Strict-Transport-Security','max-age=31536000')
    res.setHeader('X-Content-Type-Options','nosniff')
    res.setHeader('Referrer-Policy','no-referrer')
    res.setHeader('X-Frame-Options','DENY')
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'")
    try {
      const url=new URL(req.url,'http://localhost')
      const versioned=url.pathname.startsWith('/api/v1/')
      if(versioned){url.pathname=url.pathname.replace('/api/v1/','/api/');res.setHeader('API-Version','1')}
      const publicAsset=url.pathname.match(/^\/media\/uploads\/([a-f0-9-]+)\.(webp|mp4)$/)
      if(publicAsset&&['GET','HEAD'].includes(req.method)){const row=db.prepare('SELECT * FROM assets WHERE id=? AND order_id IS NULL').get(publicAsset[1]);if(!row)throw new HttpError(404,'Brak pliku.');serveAsset(req,res,await assetData(row,env,url.searchParams.get('size')==='thumb'));return}
      if (url.pathname.startsWith('/api/')) {
        const ip=digest(clientIP(req,env))
        limit(db,'api:'+ip,rateLimit)
        if(req.method==='POST'){
          const allowed=new Set([config.origin,...(config.demo?['http://localhost:5173','http://127.0.0.1:5173','http://localhost:3001','http://127.0.0.1:3001']:[])])
          if(!allowed.has(req.headers.origin)||req.headers['sec-fetch-site']==='cross-site')throw new HttpError(403,'Niedozwolone źródło żądania.')
          const restricted={'/api/admin/login':8,'/api/orders':10,'/api/contact':5,'/api/newsletter':5,'/api/tracking-access':5,'/api/personalizations':5}
          if(restricted[url.pathname])limit(db,url.pathname+':'+ip,restricted[url.pathname],600000)
        }
        if(url.pathname==='/api/openapi.json'&&req.method==='GET')return json(res,200,openApi)
        if(await editorialRoutes({db,env,config,req,res,url,json,bodyOf,requestId}))return
        if(await serviceRoutes({db,env,config,req,res,url,json,bodyOf,requestId}))return
        if(await workshopRoutes({db,env,config,req,res,url,json,bodyOf,requestId}))return
        if(req.method==='GET' && url.pathname==='/api/health'){db.prepare('SELECT 1').get();return json(res,200,{ok:true})}
        if(req.method==='GET' && url.pathname==='/api/catalog') return json(res,200,{...config,emailEnabled:Boolean(env.SMTP_HOST&&env.SMTP_USER&&env.SMTP_PASS&&env.MAIL_FROM&&env.DATA_KEY),products:listProducts(db),shipping:commerce.shipping})
        if(req.method==='GET' && /^\/api\/orders\/[^/]+$/.test(url.pathname)) {
          return json(res,200,readOrder(db,url.pathname.split('/').pop(),req.headers.authorization?.replace(/^Bearer /,'')))
        }
        if(req.method!=='POST') throw new HttpError(404,'Nie znaleziono endpointu.')
        const allowed=new Set([config.origin,...(config.demo?['http://localhost:5173','http://127.0.0.1:5173','http://localhost:3001','http://127.0.0.1:3001']:[])])
        if(!allowed.has(req.headers.origin) || req.headers['sec-fetch-site']==='cross-site') throw new HttpError(403,'Niedozwolone źródło żądania.')
        const body=await bodyOf(req)
        if(url.pathname==='/api/quote') return json(res,200,quoteOrder(body,db))
        if(url.pathname==='/api/orders') return json(res,201,createOrder(db,config,body,env))
        if(url.pathname==='/api/contact') {
          if(body.acknowledged!==true) throw new HttpError(400,'Potwierdź zapoznanie się z informacją o prywatności.')
          const name=textField(body.name,'name',2,100),email=emailField(body.email),message=textField(body.message,'message',10,4000)
          const id=randomUUID()
          db.prepare('INSERT INTO contact_messages VALUES (?,?,?,?,?,?)').run(id,new Date().toISOString(),name,email,message,Number(config.demo))
          return json(res,201,{id,status:'saved',demo:config.demo})
        }
        if(url.pathname==='/api/newsletter') {
          if(body.consent!==true) throw new HttpError(400,'Zaznacz zgodę na zapis.')
          const email=emailField(body.email)
          db.prepare('INSERT INTO newsletter_requests (email,created_at,policy_version,consent_text,demo) VALUES (?,?,?,?,?) ON CONFLICT(email) DO NOTHING').run(email,new Date().toISOString(),config.policyVersion,'Chcę otrzymywać wiadomości o nowych parach i notatkach z pracowni.',Number(config.demo))
          if(db.prepare('SELECT status FROM newsletter_requests WHERE email=?').get(email).status!=='confirmed')newsletterMail(db,env,email,'confirm')
          return json(res,201,{status:'pending_confirmation',demo:config.demo})
        }
        throw new HttpError(404,'Nie znaleziono endpointu.')
      }
      if(!['GET','HEAD'].includes(req.method)) throw new HttpError(405,'Niedozwolona metoda.')
      let decoded
      try {decoded=decodeURIComponent(url.pathname)} catch {throw new HttpError(400,'Nieprawidłowy adres.')}
      let path=resolve(dist,'.'+decoded)
      if(!path.startsWith(resolve(dist)+sep)) path=resolve(dist,'index.html')
      let exists=false
      try {exists=(await stat(path)).isFile()} catch {}
      if(!exists) {
        if(extname(decoded) || decoded.startsWith('/media/') || decoded.startsWith('/assets/')) throw new HttpError(404,'Brak pliku.')
        path=resolve(dist,'index.html')
      }
      const info=await stat(path).catch(()=>{throw new HttpError(404,'Najpierw zbuduj frontend: npm run build.')})
      const etag='W/"'+info.size.toString(16)+'-'+info.mtimeMs.toString(16)+'"'
      // Only content-hashed build assets can be cached indefinitely.
      const immutable=decoded.startsWith('/assets/')&&/-[A-Za-z0-9_-]{8,}\.(js|css)$/.test(decoded)
      const headers={'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':immutable?'public, max-age=31536000, immutable':'no-cache','ETag':etag}
      if(req.headers['if-none-match']?.split(',').map(v=>v.trim()).includes(etag)){
        res.writeHead(304,headers);res.end();return
      }
      if(req.method==='HEAD'){res.writeHead(200,headers);res.end();return}
      let data
      try {data=await readFile(path)} catch {throw new HttpError(404,'Najpierw zbuduj frontend: npm run build.')}
      res.writeHead(200,headers)
      res.end(data)
    } catch(error) {
      const status=error instanceof HttpError?error.status:500
      if(status===429){res.setHeader('Retry-After','600');audit(db,'rate_limited',requestId)}
      if(status>=500)audit(db,'server_error',requestId,String(status))
      if(res.headersSent) {res.end();return}
      json(res,status,{error:error instanceof HttpError?error.message:'Nie udało się wykonać operacji. Spróbuj ponownie.',code:({400:'validation_error',401:'authentication_required',403:'forbidden',404:'not_found',409:'conflict',413:'payload_too_large',429:'rate_limited',502:'upstream_error',503:'unavailable'})[status]||'server_error',requestId,fields:error instanceof HttpError?error.fields:{}})
    }
  })
}
