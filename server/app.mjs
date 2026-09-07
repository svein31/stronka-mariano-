import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import catalog from '../shared/catalog.json' with {type:'json'}
import commerce from '../shared/commerce.json' with {type:'json'}
import { HttpError, record, textField, emailField, quoteOrder, createOrder, readOrder } from './commerce.mjs'
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'}
async function bodyOf(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new HttpError(415,'Wymagany format JSON.')
  const chunks=[]; let size=0
  for await (const chunk of req) { size+=chunk.length; if (size>32768) throw new HttpError(413,'Formularz jest zbyt duży.'); chunks.push(chunk) }
  try {return record(JSON.parse(Buffer.concat(chunks).toString('utf8')))} catch(e) {if(e instanceof HttpError) throw e; throw new HttpError(400,'Nieprawidłowy JSON.')}
}
export function createApp({db,config,dist=resolve('dist'),rateLimit=120}) {
  const requests=new Map()
  const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value))}
  return createServer({requestTimeout:15000,headersTimeout:10000,maxHeaderSize:16384},async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff')
    res.setHeader('Referrer-Policy','no-referrer')
    res.setHeader('X-Frame-Options','DENY')
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'")
    try {
      const url=new URL(req.url,'http://localhost')
      if (url.pathname.startsWith('/api/')) {
        const now=Date.now()
        for(const [key,value] of requests) if(value.until<now) requests.delete(key)
        const key=req.socket.remoteAddress || 'unknown'
        if(!requests.has(key) && requests.size>=10000) throw new HttpError(503,'Spróbuj ponownie za chwilę.')
        const rate=requests.get(key)||{count:0,until:now+60000}; rate.count++; requests.set(key,rate)
        if(rate.count>rateLimit) {res.setHeader('Retry-After','60');throw new HttpError(429,'Za dużo prób. Spróbuj za minutę.')}
        if(req.method==='GET' && url.pathname==='/api/health') return json(res,200,{ok:true})
        if(req.method==='GET' && url.pathname==='/api/catalog') return json(res,200,{...config,products:catalog,shipping:commerce.shipping})
        if(req.method==='GET' && /^\/api\/orders\/[^/]+$/.test(url.pathname)) {
          return json(res,200,readOrder(db,url.pathname.split('/').pop(),req.headers.authorization?.replace(/^Bearer /,'')))
        }
        if(req.method!=='POST') throw new HttpError(404,'Nie znaleziono endpointu.')
        const allowed=new Set([config.origin,...(config.demo?['http://localhost:5173','http://127.0.0.1:5173','http://localhost:3001','http://127.0.0.1:3001']:[])])
        if(!allowed.has(req.headers.origin) || req.headers['sec-fetch-site']==='cross-site') throw new HttpError(403,'Niedozwolone źródło żądania.')
        const body=await bodyOf(req)
        if(url.pathname==='/api/quote') return json(res,200,quoteOrder(body))
        if(url.pathname==='/api/orders') return json(res,201,createOrder(db,config,body))
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
      let data
      try {data=await readFile(path)} catch {throw new HttpError(404,'Najpierw zbuduj frontend: npm run build.')}
      res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':path.endsWith('.html')?'no-cache':'public, max-age=3600'})
      res.end(req.method==='HEAD'?undefined:data)
    } catch(error) {
      if(res.headersSent) {res.end();return}
      json(res,error instanceof HttpError?error.status:500,{error:error instanceof HttpError?error.message:'Nie udało się zapisać danych. Spróbuj ponownie.',fields:error instanceof HttpError?error.fields:{}})
    }
  })
}
