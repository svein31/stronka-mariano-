import {useEffect,useRef,useState,type FormEvent} from 'react'
import {createPortal} from 'react-dom'
import {Link} from 'react-router-dom'
import {motion} from 'motion/react'
import type {Garment} from '../data/collection'
import {formatPrice} from '../data/collection'
import {useCart} from '../state/cart'
import {useCapabilities} from '../lib/capabilities'
import {PhotoPlate} from './PhotoPlate'
import {recommendSize} from '../lib/sizing'
export function ProductGallery({product,variant}:{product:Garment;variant:string}){
 const [index,setIndex]=useState(0)
 useEffect(()=>setIndex(0),[variant,product.slug])
 const entries=product.gallery?.filter(p=>!p.variant||p.variant===variant)||[]
 const images=entries.length?entries:[{src:'/media/'+product.slot+'-studio.webp',alt:product.alt,kind:'full'},{src:'/media/process.webp',alt:'Koncepcyjny widok ręcznego nadruku na płótnie.',kind:'process'}]
 const current=images[index]||images[0]
 return <div className="product-gallery"><figure><PhotoPlate key={current.src} slot={index?'process':product.slot+'-studio'} src={entries.length?current.src:undefined} alt={current.alt} eager/><figcaption className="photo-caption">{entries.length?current.alt:'Ilustracje koncepcyjne AI — do zastąpienia zdjęciami produktu.'}</figcaption></figure><div className="gallery-controls" aria-label="Zdjęcia produktu">{images.map((im,i)=><button type="button" key={im.src+i} aria-pressed={i===index} onClick={()=>setIndex(i)}>{i+1} / {{full:'Cała para',detail:'Nadruk',seam:'Szew',process:'Proces'}[im.kind]||'Zdjęcie'}</button>)}</div>{product.video&&<video controls preload="none" src={product.video} aria-label="Film z wykonania produktu"><track kind="captions"/>Twoja przeglądarka nie obsługuje filmu.</video>}</div>
}
export function SizeAssistant({product,onSelect}:{product:Garment;onSelect?:(size:string)=>void}){
 const [result,setResult]=useState<ReturnType<typeof recommendSize>|null>(null)
 function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget);setResult(recommendSize(product,{waist:Number(data.get('waist')),hips:Number(data.get('hips')),inseam:Number(data.get('inseam')),fit:String(data.get('fit'))}))}
 return <details className="size-assistant"><summary>Pomóż mi dobrać rozmiar</summary>{!product.measurementsVerified?<p>Rekomendacje pojawią się po zatwierdzeniu rzeczywistych pomiarów tego kroju. Na razie <Link to={'/personalize/'+product.slug}>prześlij wymiary do pracowni</Link>.</p>:<><p>Podaj obwody ciała. Długość nogawki zmierz w dobrze leżących spodniach, od kroku. Rekomendacja uwzględnia zapas, ale nie zastępuje przymiarki.</p><form onSubmit={submit}><div className="measure-grid">{[['waist','Pas'],['hips','Biodra'],['inseam','Nogawka wewnętrzna']].map(([key,label])=><label className="field" key={key}>{label} (cm)<input name={key} type="number" min="20" max="250" step="0.5" required/></label>)}</div><label className="field">Dopasowanie<select name="fit"><option value="regular">Standardowe</option><option value="relaxed">Luźniejsze</option></select></label><button className="btn" type="submit">Sprawdź rozmiar</button></form><div role="status">{result&&<><p>{result.message}</p>{result.size&&onSelect&&<button type="button" onClick={()=>onSelect(result.size!)}>Wybierz {result.size}</button>}</>}</div></>}{!!product.measurements?.length&&<div className="table-scroll"><table><caption>Wymiary gotowego kroju (cm){!product.measurementsVerified?' — niezatwierdzone':''}</caption><thead><tr><th>Rozmiar</th><th>Pas</th><th>Biodra</th><th>Nogawka</th></tr></thead><tbody>{product.measurements.map(m=><tr key={m.size}><th scope="row">{m.size}</th><td>{m.waist}</td><td>{m.hips}</td><td>{m.inseam}</td></tr>)}</tbody></table></div>}</details>
}
export function QuickView({product}:{product:Garment}){
 const [open,setOpen]=useState(false),[size,setSize]=useState(''),[variant,setVariant]=useState(product.variants[0])
 const ref=useRef<HTMLDialogElement>(null),opener=useRef<HTMLButtonElement>(null)
 const {add}=useCart(),{reducedMotion,scroll}=useCapabilities()
 useEffect(()=>{if(!open||!ref.current)return;const dialog=ref.current;dialog.showModal();scroll.stop();return()=>{dialog.close();scroll.start();opener.current?.focus({preventScroll:true})}},[open,scroll])
 function submit(e:FormEvent){e.preventDefault();ref.current?.close();setOpen(false);add({slug:product.slug,size,variant,quantity:1})}
 return <><button ref={opener} type="button" className="quick-trigger" onClick={()=>setOpen(true)} aria-haspopup="dialog">Szybki podgląd <span className="sr-only">{product.name}</span></button>{open&&typeof document!=='undefined'&&createPortal(<dialog ref={ref} className="quick-dialog glass" aria-labelledby={'quick-'+product.slug} onCancel={()=>setOpen(false)} onClick={e=>{if(e.target===ref.current)setOpen(false)}}><motion.div initial={reducedMotion?false:{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.22}}><div className="tool-heading"><h2 id={'quick-'+product.slug}>{product.name}</h2><button type="button" onClick={()=>setOpen(false)} aria-label="Zamknij szybki podgląd">Zamknij ×</button></div><div className="quick-grid"><ProductGallery product={product} variant={variant}/><div><p>{product.summary}</p><p className="product-price">{formatPrice(product.price)}</p><p>{product.leadTime}</p><form onSubmit={submit}><label className="field">Wariant<select name="variant" value={variant} onChange={e=>setVariant(e.target.value)}>{product.variants.map(v=><option key={v}>{v}</option>)}</select></label><fieldset className="size-options"><legend>Rozmiar</legend>{product.sizes.map(s=><label key={s}><input type="radio" name="quick-size" value={s} required checked={size===s} onChange={()=>setSize(s)}/><span>{s}</span></label>)}</fieldset><button className="btn" disabled={product.available===false}>Dodaj do koszyka</button></form><SizeAssistant product={product} onSelect={setSize}/><Link to={'/shop/'+product.slug} onClick={()=>setOpen(false)}>Wszystkie szczegóły produktu</Link></div></div></motion.div></dialog>,document.body)}</>
}

