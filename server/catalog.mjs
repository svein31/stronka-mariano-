import {HttpError,textField,record} from './commerce.mjs'
const sizes=['XS','S','M','L','XL','XXL']
export function listProducts(db){return db.prepare("SELECT data,revision FROM products ORDER BY json_extract(data,'$.index'),slug").all().map(row=>({...JSON.parse(row.data),revision:row.revision}))}
export function validMediaPath(path,video=false) {
 return typeof path==='string' && (path==='' || (video?/^\/media\/uploads\/[a-f0-9-]+\.mp4$/:/^\/media\/[a-z0-9/-]+\.(webp|jpg|png)$/).test(path))
}
export function saveProduct(db,slug,input) {
 record(input)
 const row=db.prepare('SELECT * FROM products WHERE slug=?').get(slug)
 if(!row)throw new HttpError(404,'Nie znaleziono produktu.')
 if(input.revision!==row.revision)throw new HttpError(409,'Produkt został zmieniony. Odśwież dane przed zapisem.')
 const old=JSON.parse(row.data),next={...old}
 for(const key of ['name','material','printStyle','leadTime','composition','care','summary','detail','alt'])next[key]=textField(input[key],key,1,key==='care'||key==='detail'?2000:400)
 if(!Number.isSafeInteger(input.price)||input.price<100||input.price>10000000)throw new HttpError(400,'Nieprawidłowa cena w groszach.')
 next.price=input.price;next.available=input.available===true
 for(const key of ['sizes','variants','customMaterials','customPrints']){
  if(!Array.isArray(input[key])||input[key].length<1||input[key].length>20)throw new HttpError(400,'Uzupełnij '+key)
  next[key]=[...new Set(input[key].map(v=>textField(v,key,1,100)))]
 }
 if(next.sizes.some(s=>!sizes.includes(s)))throw new HttpError(400,'Nieznany rozmiar.')
 next.measurementsVerified=input.measurementsVerified===true
 if(!Array.isArray(input.measurements)||input.measurements.length>20)throw new HttpError(400,'Nieprawidłowa tabela wymiarów.')
 next.measurements=input.measurements.map(m=>{
  record(m);if(!next.sizes.includes(m.size))throw new HttpError(400,'Rozmiar tabeli nie występuje w ofercie.')
  for(const k of ['waist','hips','inseam'])if(!Number.isFinite(m[k])||m[k]<20||m[k]>250)throw new HttpError(400,'Wymiary muszą być w centymetrach.')
  return {size:m.size,waist:m.waist,hips:m.hips,inseam:m.inseam}
 })
 if(new Set(next.measurements.map(m=>m.size)).size!==next.measurements.length)throw new HttpError(400,'Powtórzony rozmiar tabeli.')
 if(next.measurementsVerified && next.sizes.some(s=>!next.measurements.find(m=>m.size===s)))throw new HttpError(400,'Zatwierdź kompletną tabelę dla wszystkich rozmiarów.')
 if(!Array.isArray(input.gallery)||input.gallery.length>20)throw new HttpError(400,'Maksymalnie 20 zdjęć.')
 next.gallery=input.gallery.map(image=>{
  record(image)
  if(!validMediaPath(image.src)||!image.src)throw new HttpError(400,'Zdjęcie musi pochodzić z galerii tej strony.')
  if(image.variant && !next.variants.includes(image.variant))throw new HttpError(400,'Nieznany wariant zdjęcia.')
  if(image.src.startsWith('/media/uploads/')&&!db.prepare('SELECT 1 FROM assets WHERE id=? AND order_id IS NULL').get(image.src.split('/').pop().split('.')[0]))throw new HttpError(400,'Brak publicznego pliku.')
  return {src:image.src,alt:textField(image.alt,'alt',3,300),variant:image.variant||'',kind:['full','detail','seam','process'].includes(image.kind)?image.kind:'full'}
 })
 if(!validMediaPath(input.video,true))throw new HttpError(400,'Film musi być przesłanym plikiem MP4.')
 next.video=input.video
 if(next.video&&!db.prepare("SELECT 1 FROM assets WHERE id=? AND mime='video/mp4' AND order_id IS NULL").get(next.video.split('/').pop().split('.')[0]))throw new HttpError(400,'Brak filmu.')
 const saved=db.prepare('UPDATE products SET data=?,revision=revision+1 WHERE slug=? AND revision=?').run(JSON.stringify(next),slug,row.revision)
 if(!saved.changes)throw new HttpError(409,'Produkt został zmieniony. Odśwież dane.')
 return {...next,revision:row.revision+1}
}
