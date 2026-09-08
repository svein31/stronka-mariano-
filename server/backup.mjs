import {backup,DatabaseSync} from 'node:sqlite'
import {mkdtemp,readFile,writeFile,rm,stat,mkdir} from 'node:fs/promises'
import {join,resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {randomUUID} from 'node:crypto'
import {S3Client,PutObjectCommand,GetObjectCommand} from '@aws-sdk/client-s3'
import {encrypt,decrypt,digest} from './security.mjs'
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
  await storage.send(new PutObjectCommand({Bucket:env.BACKUP_BUCKET,Key:key,Body:encrypted,ContentType:'application/octet-stream'}),{abortSignal:AbortSignal.timeout(30000)})
  // Test the downloaded remote object, not just the local encrypted buffer.
  const object=await storage.send(new GetObjectCommand({Bucket:env.BACKUP_BUCKET,Key:key}),{abortSignal:AbortSignal.timeout(30000)})
  const downloaded=Buffer.from(await object.Body.transformToByteArray())
  const restored=join(directory,'restored.sqlite')
  await writeFile(restored,checkArchive(downloaded,env.BACKUP_KEY,checksum),{mode:0o600})
  const counts=await verifyDatabase(restored)
  db.prepare('INSERT INTO operations VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('backup_verified',JSON.stringify({at:new Date().toISOString(),key,counts}))
  return {key,counts}
 }finally{await rm(directory,{recursive:true,force:true})}
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
