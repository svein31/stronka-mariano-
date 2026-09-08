import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react'
import {garments,type Garment} from '../data/collection'
import {useProducts} from './store'
import commerce from '../../shared/commerce.json'
export interface CartInput {slug:string;size:string;variant:string;quantity:number}
export interface CartLine extends CartInput {key:string;name:string;price:number;slot:string;alt:string}
export function consumeCart(lines:CartLine[],submitted:CartInput[]):CartLine[] {
 const amounts=new Map(submitted.map(l=>[[l.slug,l.size,l.variant].join('|'),l.quantity]))
 return lines.map(line=>({...line,quantity:Math.max(0,line.quantity-(amounts.get(line.key)||0))})).filter(line=>line.quantity>0)
}
export const STORAGE_KEY='workshop.cart.v2'
export function normalizeCart(value:unknown,products:Garment[]=garments):CartLine[] {
 if(!Array.isArray(value))return []
 const merged=new Map<string,CartLine>()
 for(const item of value) {
  if(!item||typeof item!=='object')continue
  const product=products.find(p=>p.slug===item.slug)
  if(!product||!product.sizes.includes(item.size)||!product.variants.includes(item.variant)||!Number.isInteger(item.quantity)||item.quantity<1)continue
  const key=[product.slug,item.size,item.variant].join('|'),old=merged.get(key)
  if(!old&&merged.size>=commerce.maxLines)continue
  merged.set(key,{slug:product.slug,size:item.size,variant:item.variant,quantity:Math.min(commerce.maxQuantity,(old?.quantity||0)+item.quantity),key,name:product.name,price:product.price,slot:product.slot,alt:product.alt})
 }
 return [...merged.values()]
}
export const toOrderLines=(lines:CartLine[])=>lines.map(({slug,size,variant,quantity})=>({slug,size,variant,quantity}))
export function readCart():CartLine[] {try{return normalizeCart(JSON.parse(window.localStorage.getItem(STORAGE_KEY)||'[]'))}catch{return []}}
interface Cart {lines:CartLine[];open:boolean;setOpen:(open:boolean)=>void;total:number;count:number;notice:string;add:(line:CartInput)=>void;remove:(key:string)=>void;setQuantity:(key:string,quantity:number)=>void;clear:()=>void;consume:(submitted:CartInput[])=>void}
const Context=createContext<Cart|null>(null)
export function CartProvider({children}:{children:ReactNode}) {
 const products=useProducts()
 const [raw,setLines]=useState<CartInput[]>(()=>{try{const value=JSON.parse(window.localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(value)?value.slice(0,20):[]}catch{return []}}),[open,setOpen]=useState(false),[notice,setNotice]=useState('')
 const lines=useMemo(()=>normalizeCart(raw,products),[raw,products])
 useEffect(()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(raw))}catch{}},[raw])
 const value=useMemo<Cart>(()=>({lines,open,setOpen,total:lines.reduce((s,l)=>s+l.price*l.quantity,0),count:lines.reduce((s,l)=>s+l.quantity,0),notice,
 add:(line)=>{if(!normalizeCart([line],products).length)return;setLines(old=>normalizeCart([...old,line],products));setNotice('Dodano do koszyka.');setOpen(true)},
 remove:(key)=>{setLines(old=>normalizeCart(old,products).filter(l=>l.key!==key));setNotice('Usunięto pozycję.')},
 setQuantity:(key,quantity)=>{if(!Number.isInteger(quantity)||quantity<1||quantity>10)return;setLines(old=>normalizeCart(old,products).map(l=>l.key===key?{...l,quantity}:l))},
 clear:()=>setLines([]),consume:(submitted)=>setLines(old=>consumeCart(normalizeCart(old,products),submitted))}),[lines,open,notice,products])
 return <Context.Provider value={value}>{children}</Context.Provider>
}
export function useCart(){const value=useContext(Context);if(!value)throw new Error('CartProvider missing');return value}
