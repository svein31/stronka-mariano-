import catalog from '../../shared/catalog.json'
import brand from '../../shared/brand.json'
export interface Cloth { drape: number; sheen: number; weave: number; weight: number }
export type Garment = (typeof catalog)[number]
export const garments = catalog
export const garmentBySlug = (slug?: string) => garments.find(product => product.slug === slug)
export const formatPrice = (amount: number) => new Intl.NumberFormat(brand.locale, {style:'currency', currency:brand.currency}).format(amount / 100)
export function filterGarments(params: URLSearchParams) {
  return garments.filter(p => (!params.get('material') || p.material === params.get('material')) && (!params.get('print') || p.printStyle === params.get('print')) && (!params.get('size') || p.sizes.includes(params.get('size')!)))
}
