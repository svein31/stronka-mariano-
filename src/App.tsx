import {Route,Routes} from 'react-router-dom'
import brand from '../shared/brand.json'
import {Nav} from './components/Nav'
import {Bag} from './components/Bag'
import {Newsletter} from './components/Newsletter'
import {SiteLink} from './components/Transition'
import {ROUTES,HELP_ROUTES,LEGAL_ROUTES,EXPLORE_ROUTES} from './routes/manifest'
import {Home,Collection,Product,Atelier,Journal,JournalArticle,CartPage,FAQ,SizeGuide,Contact,Legal,NotFound} from './routes/Pages'
import {Checkout,OrderConfirmation} from './routes/Checkout'
import {Tracking,Personalization,NewsletterAction} from './routes/Workshop'
import {Admin} from './routes/Admin'
import {Collections,DropPage,EditorialPage,HelpCenter} from './routes/Editorial'
import {PersonalizationStart} from './routes/PersonalizationStart'
import {ConnectionStatus} from './components/ConnectionStatus'
export function App() {
 return <><div id="site-content"><Nav/><main id="main-content"><ConnectionStatus/><Routes>
 <Route path="/" element={<Home/>}/><Route path="/shop" element={<Collection/>}/><Route path="/collection" element={<Collection/>}/><Route path="/shop/:slug" element={<Product/>}/><Route path="/collection/:slug" element={<Product/>}/>
 <Route path="/collections" element={<Collections/>}/><Route path="/archive" element={<Collections archive/>}/><Route path="/lookbook" element={<EditorialPage page="lookbook"/>}/><Route path="/drops/:slug" element={<DropPage/>}/><Route path="/help" element={<HelpCenter/>}/><Route path="/personalize" element={<PersonalizationStart/>}/><Route path="/admin" element={<Admin/>}/><Route path="/track" element={<Tracking/>}/><Route path="/personalize/:slug" element={<Personalization/>}/><Route path="/newsletter" element={<NewsletterAction/>}/>
 <Route path="/process" element={<Atelier/>}/><Route path="/atelier" element={<Atelier/>}/><Route path="/journal" element={<Journal/>}/><Route path="/journal/:slug" element={<JournalArticle/>}/>
 <Route path="/cart" element={<CartPage/>}/><Route path="/checkout" element={<Checkout/>}/><Route path="/order-confirmation" element={<OrderConfirmation/>}/><Route path="/faq" element={<FAQ/>}/><Route path="/size-guide" element={<SizeGuide/>}/><Route path="/contact" element={<Contact/>}/>
 <Route path="/terms" element={<Legal kind="terms"/>}/><Route path="/privacy" element={<Legal kind="privacy"/>}/><Route path="/shipping-returns" element={<Legal kind="shipping-returns"/>}/><Route path="*" element={<NotFound/>}/>
 </Routes></main><footer className="footer"><div className="shell"><div className="footer__grid"><div><SiteLink className="footer__wordmark" to="/">{brand.name.toLowerCase()}</SiteLink><p>{brand.tagline}</p><p className="small">Autorski design. Produkcja: Bangladesz.</p></div><nav aria-label="Pomoc i informacje"><ul>{[...ROUTES,...EXPLORE_ROUTES,...HELP_ROUTES].map(r=><li key={r.to}><SiteLink to={r.to}>{r.label}</SiteLink></li>)}</ul></nav><Newsletter/></div><div className="footer__bottom"><p className="small">Kolekcja demonstracyjna · fotografie koncepcyjne AI</p><nav aria-label="Dokumenty">{LEGAL_ROUTES.map(r=><SiteLink key={r.to} to={r.to}>{r.label}</SiteLink>)}</nav></div></div></footer></div><Bag/></>
}
