import {backup,DatabaseSync} from 'node:sqlite'
import {mkdtemp,readFile,writeFile,rm,stat,mkdir} from 'node:fs/promises'
import {join,resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {randomUUID} from 'node:crypto'
import {S3Client,PutObjectCommand,GetObjectCommand} from '@aws-sdk/client-s3'
import {encrypt,decrypt,digest} from './security.mjs'
import {assetData,mediaStore} from './media-store.mjs'
export async function backupMedia(db,env,storage){
 const files=[]
 // Assets are immutable and addressed by ID. Separate encrypted objects are reused
 // between snapshots, keeping each request bounded to one upload (12 MB maximum).
 for(const row of db.prepare('SELECT * FROM assets WHERE storage_key IS NOT NULL').all()){
  for(const [mediaKey,thumbnail] of [[row.storage_key,false],...(row.thumbnail_key?[[row.thumbnail_key,true]]:[])]){
   const bytes=Buffer.from((await assetData(row,env,thumbnail)).bytes),checksum=digest(bytes)
   const key='mariano/media/'+digest(env.BACKUP_KEY).slice(0,16)+'/'+checksum+'.enc'
   let valid=false
   try{const remote=await storage.send(new GetObjectCommand({Bucket:env.BACKUP_BUCKET,Key:key}),{abortSignal:AbortSignal.timeout(30000)});valid=digest(decrypt(Buffer.from(await remote.Body.transformToByteArray()),env.BACKUP_KEY))===checksum}catch{}
   if(!valid){await storage.send(new PutObjectCommand({Bucket:env.BACKUP_BUCKET,Key:key,Body:encrypt(bytes,env.BACKUP_KEY),ContentType:'application/octet-stream'}),{abortSignal:AbortSignal.timeout(30000)});const remote=await storage.send(new GetObjectCommand({Bucket:env.BACKUP_BUCKET,Key:key}),{abortSignal:AbortSignal.timeout(30000)});if(digest(decrypt(Buffer.from(await remote.Body.transformToByteArray()),env.BACKUP_KEY))!==checksum)throw Error('Media backup verification failed')}
   files.push({mediaKey,key,checksum,mime:thumbnail?'image/webp':row.mime})
  }
 }
 return files
}
function checkArchive(bytes,key,expected){
 const plain=decrypt(bytes,key)
 if(expected&&digest(plain)!==expected)throw Error('Restored bytes differ from snapshot')
 return plain
}
export async function verifyDatabase(path){
 const restored=new DatabaseSync(path,{readOnly:true})
 try{
  if(restored.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Restored database integrity check failed')
  if(restored.prepare('PRAGMA foreign_key_check').all().length)throw Error('Restored database foreign keys failed')
  return {orders:restored.prepare('SELECT count(*) AS n FROM orders').get().n,products:restored.prepare('SELECT count(*) AS n FROM products').get().n}
 }finally{restored.close()}
}
export async function runBackup(db,env=process.env,client){
 if(!env.BACKUP_BUCKET||!/^[a-f0-9]{64}$/.test(env.BACKUP_KEY||''))throw Error('Configure BACKUP_BUCKET and BACKUP_KEY')
 if(env.BACKUP_ENDPOINT&&!env.BACKUP_ENDPOINT.startsWith('https://'))throw Error('Backup endpoint must use HTTPS')
 const directory=await mkdtemp(join(tmpdir(),'mariano-backup-'))
 try{
  const snapshot=join(directory,'snapshot.sqlite');await backup(db,snapshot)
  if((await stat(snapshot)).size>256*1024*1024)throw Error('Backup exceeds 256 MB; configure streaming backup before growing storage')
  const plain=await readFile(snapshot),checksum=digest(plain),encrypted=encrypt(plain,env.BACKUP_KEY)
  const storage=client||new S3Client({region:env.BACKUP_REGION||'auto',endpoint:env.BACKUP_ENDPOINT||undefined,forcePathStyle:env.BACKUP_PATH_STYLE==='true',maxAttempts:3})
  const key='mariano/'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID()+'.enc'
  const snapshotDb=new DatabaseSync(snapshot,{readOnly:true})
  let files
  try{files=await backupMedia(snapshotDb,env,storage)}finally{snapshotDb.close()}
  if(files.length){
   const manifest=encrypt(JSON.stringify(files),env.BACKUP_KEY)
   await storage.send(new PutObjectCommand({Bucket:env.BACKUP_BUCKET,Key:key+'.media.enc',Body:manifest,ContentType:'application/octet-stream'}),{abortSignal:AbortSignal.timeout(30000)})
   const remote=await storage.send(new GetObjectCommand({Bucket:env.BACKUP_BUCKET,Key:key+'.media.enc'}),{abortSignal:AbortSignal.timeout(30000)})
   if(digest(decrypt(Buffer.from(await remote.Body.transformToByteArray()),env.BACKUP_KEY))!==digest(JSON.stringify(files)))throw Error('Media manifest verification failed')
  }
  await storage.send(new PutObjectCommand({Bucket:env.BACKUP_BUCKET,Key:key,Body:encrypted,ContentType:'application/octet-stream'}),{abortSignal:AbortSignal.timeout(30000)})
  // Test the downloaded remote object, not just the local encrypted buffer.
  const object=await storage.send(new GetObjectCommand({Bucket:env.BACKUP_BUCKET,Key:key}),{abortSignal:AbortSignal.timeout(30000)})
  const downloaded=Buffer.from(await object.Body.transformToByteArray())
  const restored=join(directory,'restored.sqlite')
  await writeFile(restored,checkArchive(downloaded,env.BACKUP_KEY,checksum),{mode:0o600})
  const counts=await verifyDatabase(restored)
  db.prepare('INSERT INTO operations VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('backup_verified',JSON.stringify({at:new Date().toISOString(),key,counts,media:files.length}))
  return {key,counts,media:files.length}
 }finally{await rm(directory,{recursive:true,force:true})}
}
export async function restoreMedia(manifestPath,env=process.env,storage){
 const files=JSON.parse(decrypt(await readFile(manifestPath),env.BACKUP_KEY).toString())
 if(!Array.isArray(files)||files.length>20000)throw Error('Invalid media manifest')
 const s3=storage||new S3Client({region:env.BACKUP_REGION||'auto',endpoint:env.BACKUP_ENDPOINT||undefined,forcePathStyle:env.BACKUP_PATH_STYLE==='true'})
 const target=mediaStore(env)
 for(const file of files){
  if(!/^mariano\/media\/[a-f0-9]{16}\/[a-f0-9]{64}\.enc$/.test(file.key)||!/^media\/[a-f0-9-]+(?:-thumb)?\.(webp|mp4)$/.test(file.mediaKey))throw Error('Invalid media manifest path')
  const object=await s3.send(new GetObjectCommand({Bucket:env.BACKUP_BUCKET,Key:file.key}),{abortSignal:AbortSignal.timeout(30000)})
  const bytes=decrypt(Buffer.from(await object.Body.transformToByteArray()),env.BACKUP_KEY)
  if(digest(bytes)!==file.checksum)throw Error('Invalid media checksum')
  let existing;try{existing=await target.get(file.mediaKey)}catch(e){if(e.code!=='ENOENT'&&e.name!=='NoSuchKey'&&e.$metadata?.httpStatusCode!==404)throw e}
  if(existing){if(digest(existing)!==file.checksum)throw Error('Refusing to overwrite different media');continue}
  await target.put(file.mediaKey,bytes,file.mime)
  if(digest(await target.get(file.mediaKey))!==file.checksum)throw Error('Media restore verification failed')
 }
 return {files:files.length}
}
export async function restoreBackup(archive,destination,key){
 const target=resolve(destination),bytes=await readFile(archive)
 const plain=checkArchive(bytes,key)
 await mkdir(resolve(target,'..'),{recursive:true,mode:0o700})
 // Never overwrite a database. Verify in an isolated directory first.
 const directory=await mkdtemp(join(tmpdir(),'mariano-restore-'))
 try{const candidate=join(directory,'verify.sqlite');await writeFile(candidate,plain,{mode:0o600});const counts=await verifyDatabase(candidate);await writeFile(target,plain,{flag:'wx',mode:0o600});return counts}
 finally{await rm(directory,{recursive:true,force:true})}
}
