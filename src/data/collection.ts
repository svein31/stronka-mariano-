import catalog from '../../shared/catalog.json'
import brand from '../../shared/brand.json'
export interface Cloth { drape: number; sheen: number; weave: number; weight: number }
export type Garment = (typeof catalog)[number] & {available?:boolean;revision?:number;measurementsVerified?:boolean;measurements?:{size:string;waist:number;hips:number;inseam:number}[];gallery?:{src:string;alt:string;variant?:string;kind:string}[];video?:string;customMaterials?:string[];customPrints?:string[]}
export const garments = catalog
export const garmentBySlug = (slug?: string) => garments.find(product => product.slug === slug)
export const formatPrice = (amount: number) => new Intl.NumberFormat(brand.locale, {style:'currency', currency:brand.currency}).format(amount / 100)
export function filterGarments(params: URLSearchParams,products:Garment[]=garments) {
  return products.filter(p => (!params.get('material') || p.material === params.get('material')) && (!params.get('print') || p.printStyle === params.get('print')) && (!params.get('size') || p.sizes.includes(params.get('size')!)))
}

export function sortGarments(products:Garment[],order:string|null) {
 const sorted=[...products]
 if(order==='price-asc')sorted.sort((a,b)=>a.price-b.price)
 if(order==='price-desc')sorted.sort((a,b)=>b.price-a.price)
 return sorted
}
