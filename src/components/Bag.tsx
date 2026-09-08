import {useMobile,useSheetDrag} from '../lib/motion-layers'
import {motion} from 'motion/react'
import {GlassGlint} from './Interactions'
import {useEffect,useRef} from 'react'
import {Link} from 'react-router-dom'
import {useCart} from '../state/cart'
import {useCapabilities} from '../lib/capabilities'
import {useFocusTrap} from '../lib/focus'
import {formatPrice} from '../data/collection'
import {PhotoPlate} from './PhotoPlate'
export function CartLines({prefix='cart'}:{prefix?:string}) {
 const {lines,remove,setQuantity}=useCart()
 return lines.length?<ul className="bag-lines">{lines.map(line=><li className="bag-line" key={line.key}>
 <PhotoPlate slot={line.slot+'-studio'} alt={line.alt}/><div><h3>{line.name}</h3><p className="small">{line.size} · {line.variant}</p><p>{formatPrice(line.price*line.quantity)}</p>
 <div className="bag-line__controls"><label htmlFor={prefix+line.key}>Ilość <span className="sr-only">{line.name}, {line.size}</span></label><select id={prefix+line.key} value={line.quantity} onChange={e=>setQuantity(line.key,Number(e.target.value))}>{Array.from({length:10},(_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select>
 <button className="text-button" onClick={()=>remove(line.key)} aria-label={'Usuń '+line.name+', '+line.size}>Usuń</button></div></div></li>)}</ul>:<p className="empty">Koszyk czeka na Twoją parę. <Link to="/shop">Obejrzyj spodnie →</Link></p>
}
export function Bag() {
 const {lines,total,open,setOpen,notice}=useCart(),{scroll,reducedMotion}=useCapabilities()
 const surface=useRef<HTMLDivElement>(null),mobile=useMobile()
 const Surface=mobile?'div':motion.div
 useSheetDrag(surface,open,mobile,()=>setOpen(false))
 useFocusTrap(surface,open,{onEscape:()=>setOpen(false)})
 useEffect(()=>{if(!open)return;const content=document.getElementById('site-content'),prior=content?.inert??false;if(content)content.inert=true;scroll.stop();return()=>{if(content)content.inert=prior;scroll.start()}},[open,scroll])
 return <><motion.div initial={false} animate={{opacity:open?.6:0}} transition={{duration:reducedMotion?0:.24}} className="drawer__scrim" data-open={open} aria-hidden="true" onClick={()=>setOpen(false)}/>
 <Surface {...(!mobile?{initial:false,animate:{x:open?0:'105%',opacity:open?1:0},transition:{duration:reducedMotion?0:.28,ease:[.22,1,.36,1] as [number,number,number,number]}}:{})} ref={surface} className={'drawer glass'+(mobile?' mobile-sheet':'')} aria-hidden={!open} data-open={open} role="dialog" aria-modal={open||undefined} aria-labelledby="bag-title" inert={!open} tabIndex={-1} data-lenis-prevent>
 <button className="sheet-handle" aria-label="Zamknij koszyk lub przeciągnij w dół" onClick={()=>setOpen(false)}/><GlassGlint/><div className="drawer__head"><h2 id="bag-title">Twoje wybory</h2><button onClick={()=>setOpen(false)} aria-label="Zamknij koszyk" className="text-button">Zamknij ×</button></div>
 <p className="small" role="status">{notice}</p><div className="drawer__body"><CartLines prefix="drawer"/></div>
 {!!lines.length&&<div className="bag-summary"><p className="total"><span>Produkty</span><strong>{formatPrice(total)}</strong></p><p className="small">Dostawa w kolejnym kroku. Płatności są wyłączone.</p><Link className="btn" to="/checkout" onClick={()=>setOpen(false)}>Przejdź do zamówienia →</Link><Link to="/cart" onClick={()=>setOpen(false)}>Zobacz cały koszyk</Link></div>}
 </Surface></>
}
