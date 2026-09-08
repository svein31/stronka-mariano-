import {Link} from 'react-router-dom'
import {useProducts} from '../state/store'
import {PageHeading} from './Pages'
import {EditorialImage} from './Editorial'
export function PersonalizationStart(){const products=useProducts();return <><PageHeading eyebrow="MARIANO / TWÓJ PROJEKT" title="Zacznij od modelu." text="Zapytaj o zmianę wzoru lub wymiarów. Możliwość wykonania potwierdzimy z producentem."/><section className="shell section editorial-products">{products.map(p=><article key={p.slug}><Link to={'/personalize/'+p.slug}><EditorialImage image={p.gallery?.[0]?.src||'/media/'+p.slot+'-studio.webp'} alt={p.alt}/><h2>{p.name}</h2><span>Przejdź do projektu</span></Link></article>)}</section></>}
