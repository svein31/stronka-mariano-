import {mkdir,writeFile,readFile,rename} from 'node:fs/promises'
import {resolve,dirname} from 'node:path'
import {S3Client,PutObjectCommand,GetObjectCommand} from '@aws-sdk/client-s3'
import sharp from 'sharp'
import {digest} from './security.mjs'
const safeKey=key=>{if(!/^media\/[a-f0-9-]+(?:-thumb)?\.(webp|mp4)$/.test(key))throw Error('Invalid media key');return key}
export function mediaStore(env=process.env,client){
 if(env.MEDIA_ENDPOINT&&!env.MEDIA_ENDPOINT.startsWith('https://'))throw Error('Media endpoint requires HTTPS')
 const backend=env.MEDIA_BUCKET?'s3':'disk',root=resolve(env.MEDIA_DIR||'var/media')
 const s3=backend==='s3'?(client||new S3Client({region:env.MEDIA_REGION||'auto',endpoint:env.MEDIA_ENDPOINT||undefined,forcePathStyle:env.MEDIA_PATH_STYLE==='true',credentials:{accessKeyId:env.MEDIA_ACCESS_KEY_ID||'',secretAccessKey:env.MEDIA_SECRET_ACCESS_KEY||''}})):null
 return {backend,async put(key,bytes,mime){safeKey(key);if(s3){await s3.send(new PutObjectCommand({Bucket:env.MEDIA_BUCKET,Key:key,Body:bytes,ContentType:mime}),{abortSignal:AbortSignal.timeout(30000)})}else{const path=resolve(root,key);await mkdir(dirname(path),{recursive:true,mode:0o700});const temp=path+'.tmp-'+crypto.randomUUID();await writeFile(temp,bytes,{mode:0o600});await rename(temp,path)}},async get(key){safeKey(key);if(s3){const r=await s3.send(new GetObjectCommand({Bucket:env.MEDIA_BUCKET,Key:key}),{abortSignal:AbortSignal.timeout(30000)});return Buffer.from(await r.Body.transformToByteArray())}return readFile(resolve(root,key))}}
}
export async function migrateAsset(db,id,env=process.env,store=mediaStore(env)){
 const row=db.prepare('SELECT * FROM assets WHERE id=?').get(id)
 if(!row||row.storage_key)return
 const bytes=Buffer.from(row.bytes),key='media/'+id+(row.mime==='video/mp4'?'.mp4':'.webp')
 await store.put(key,bytes,row.mime)
 // Verify durable bytes before releasing the SQLite copy.
 if(digest(await store.get(key))!==digest(bytes))throw Error('Media verification failed')
 let thumb=null
 if(row.mime==='image/webp'){thumb='media/'+id+'-thumb.webp';const thumbnail=await sharp(bytes).resize({width:480,withoutEnlargement:true}).webp({quality:75}).toBuffer();await store.put(thumb,thumbnail,'image/webp');if(digest(await store.get(thumb))!==digest(thumbnail))throw Error('Thumbnail verification failed')}
 db.prepare("UPDATE assets SET storage_key=?,thumbnail_key=?,storage_backend=?,checksum=?,byte_size=?,bytes=X'' WHERE id=? AND storage_key IS NULL").run(key,thumb,store.backend,digest(bytes),bytes.length,id)
}
export async function assetData(row,env=process.env,thumbnail=false){
 if(!row.storage_key)return row
 const store=mediaStore(env)
 if(row.storage_backend!==store.backend)throw Error('Restore the configured media store before serving files')
 return {...row,bytes:await store.get(thumbnail&&row.thumbnail_key?row.thumbnail_key:row.storage_key)}
}
