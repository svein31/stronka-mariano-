import {randomBytes,scrypt as scryptCallback,timingSafeEqual,createHash,createCipheriv,createDecipheriv} from 'node:crypto'
import {promisify} from 'node:util'
import {isIP} from 'node:net'
import {verify} from 'otplib'
import {HttpError} from './commerce.mjs'
const scrypt=promisify(scryptCallback)
let activePasswordChecks=0
export const digest=value=>createHash('sha256').update(value).digest('hex')
export const token=()=>randomBytes(32).toString('hex')
export async function passwordHash(password){
 if(typeof password!=='string'||password.length<8||password.length>128)throw Error('Hasło musi mieć 8–128 znaków.')
 const salt=randomBytes(16).toString('hex'),key=await scrypt(password,salt,64,{N:131072,r:8,p:1,maxmem:256*1024*1024})
 return 'scrypt:'+salt+':'+key.toString('hex')
}
async function passwordMatches(password,encoded){
 if(typeof password!=='string'||password.length>128||!/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(encoded||''))return false
 const [,salt,key]=encoded.split(':'),derived=await scrypt(password,salt,64,{N:131072,r:8,p:1,maxmem:256*1024*1024})
 return timingSafeEqual(derived,Buffer.from(key,'hex'))
}
export function encrypt(data,key){
 if(!/^[a-f0-9]{64}$/.test(key||''))throw Error('DATA_KEY must contain 32 random bytes in hex.')
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(key,'hex'),iv)
 const bytes=Buffer.isBuffer(data)?data:Buffer.from(data)
 return Buffer.concat([Buffer.from('MARI1'),iv,cipher.update(bytes),cipher.final(),cipher.getAuthTag()])
}
export function decrypt(bytes,key){
 if(!/^[a-f0-9]{64}$/.test(key||'')||bytes.subarray(0,5).toString()!=='MARI1'||bytes.length<33)throw Error('Invalid encrypted archive')
 const decipher=createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),bytes.subarray(5,17))
 decipher.setAuthTag(bytes.subarray(-16))
 return Buffer.concat([decipher.update(bytes.subarray(17,-16)),decipher.final()])
}
export function clientIP(req,env=process.env){
 const direct=req.socket.remoteAddress||'unknown'
 const trusted=(env.TRUSTED_PROXIES||'').split(',').map(s=>s.trim()).filter(Boolean)
 // Proxy must overwrite X-Real-IP. Never trust an arbitrary forwarded chain.
 const real=req.headers['x-real-ip']
 return trusted.includes(direct)&&typeof real==='string'&&isIP(real)?real:direct
}
export function limit(db,key,max,windowMs=60000,now=Date.now()){
 db.prepare('DELETE FROM rate_limits WHERE until<?').run(now)
 const entry=db.prepare('SELECT * FROM rate_limits WHERE key=?').get(key)
 if(entry?.count>=max)throw new HttpError(429,'Za dużo prób. Spróbuj później.')
 if(!entry && db.prepare('SELECT count(*) AS n FROM rate_limits').get().n>=10000)throw new HttpError(503,'Spróbuj później.')
 db.prepare('INSERT INTO rate_limits VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key,1,now+windowMs)
}
export function audit(db,event,requestId='',detail=''){
 try{
 db.prepare('INSERT INTO audit_events(created_at,event,request_id,detail) VALUES(?,?,?,?)').run(new Date().toISOString(),event,requestId,detail.slice(0,120))
 // Bounded event store; identifiers/codes only, never customer input or auth headers.
 db.prepare('DELETE FROM audit_events WHERE id < (SELECT COALESCE(MAX(id),0)-5000 FROM audit_events)').run()
 }catch{console.info(JSON.stringify({event:'audit_store_failed',requestId}))}
 console.info(JSON.stringify({event,requestId,detail:detail.slice(0,120)}))
}
export async function login(db,body,env=process.env){
 const staff=typeof body.email==='string'&&db.prepare('SELECT * FROM staff WHERE email=? AND active=1').get(body.email.toLowerCase())
 const actor=staff?.id||'owner'
 const identity=staff?{ADMIN_EMAIL:staff.email,ADMIN_PASSWORD_HASH:staff.password_hash,ADMIN_TOTP_SECRET:staff.totp_secret}:env
 const role=staff?.role||'owner'
 env={...env,...identity}
 if(!env.ADMIN_EMAIL||!env.ADMIN_PASSWORD_HASH)throw new HttpError(503,'Panel wymaga konfiguracji właściciela.')
 if(env.STORE_MODE==='live'&&!env.ADMIN_TOTP_SECRET)throw new HttpError(503,'Włącz drugi składnik logowania.')
 if(activePasswordChecks>=2)throw new HttpError(503,'Logowanie zajęte. Spróbuj za chwilę.')
 let passwordOK
 activePasswordChecks++
 try{passwordOK=await passwordMatches(body.password,env.ADMIN_PASSWORD_HASH)}finally{activePasswordChecks--}
 if(!passwordOK||body.email?.toLowerCase()!==env.ADMIN_EMAIL.toLowerCase())throw new HttpError(401,'Nieprawidłowe dane logowania.')
 if(env.ADMIN_TOTP_SECRET){
  if(!/^\d{6}$/.test(body.otp||''))throw new HttpError(401,'Podaj aktualny kod z aplikacji uwierzytelniającej.')
  const result=await verify({secret:env.ADMIN_TOTP_SECRET,token:body.otp,epochTolerance:0})
  if(!result.valid)throw new HttpError(401,'Nieprawidłowy kod.')
  const step=Math.floor(Date.now()/30000)
  if(db.prepare('SELECT 1 FROM staff_otp WHERE actor_id=? AND step=?').get(actor,step))throw new HttpError(401,'Kod został już użyty. Poczekaj na następny.')
  db.prepare('INSERT INTO staff_otp VALUES(?,?)').run(actor,step);db.prepare('DELETE FROM staff_otp WHERE step<?').run(step-2)
 }
 const secret=token(),csrf=token(),now=Date.now()
 db.prepare('DELETE FROM admin_sessions WHERE expires<? OR touched<?').run(now,now-1800000)
 db.prepare('INSERT INTO admin_sessions(hash,csrf,expires,touched,credential_hash,actor_id) VALUES(?,?,?,?,?,?)').run(digest(secret),csrf,now+8*3600000,now,digest((env.ADMIN_PASSWORD_HASH||'')+(env.ADMIN_TOTP_SECRET||'')),actor)
 return {secret,csrf,role,actorId:actor}
}
export function owner(db,req,write=false,env=process.env){
 const secret=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('mariano_owner='))?.slice(14)
 const row=secret&&db.prepare('SELECT * FROM admin_sessions WHERE hash=?').get(digest(secret))
 const staff=row?.actor_id!=='owner'&&row&&db.prepare('SELECT * FROM staff WHERE id=? AND active=1').get(row.actor_id)
 if(row?.actor_id!=='owner'&&row&&!staff)throw new HttpError(401,'Konto jest nieaktywne.')
 if(staff)env={...env,ADMIN_PASSWORD_HASH:staff.password_hash,ADMIN_TOTP_SECRET:staff.totp_secret}
 if(!row||row.expires<Date.now()||row.touched<Date.now()-1800000||row.credential_hash!==digest((env.ADMIN_PASSWORD_HASH||'')+(env.ADMIN_TOTP_SECRET||'')))throw new HttpError(401,'Zaloguj się ponownie.')
 if(write&&req.headers['x-csrf-token']!==row.csrf)throw new HttpError(403,'Odśwież panel i ponów działanie.')
 db.prepare('UPDATE admin_sessions SET touched=? WHERE hash=?').run(Date.now(),row.hash)
 return {...row,role:staff?.role||'owner'}
}
export const sessionCookie=(secret,secure,logout=false)=>'mariano_owner='+secret+'; HttpOnly; SameSite=Strict; Path=/api; Max-Age='+(logout?0:28800)+(secure?'; Secure':'')
export function permit(session,roles){if(!roles.includes(session.role))throw new HttpError(403,'Twoja rola nie ma dostępu do tej operacji.')}
