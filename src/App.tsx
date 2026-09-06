import { Route, Routes } from 'react-router-dom'
import { Nav } from './components/Nav'
import { Bag } from './components/Bag'
import { SumiLink } from './components/Transition'
import { ROUTES, APPOINTMENT_EMAIL } from './routes/manifest'
import { Home, Collection, Product, Atelier, Journal, JournalArticle, NotFound } from './routes/Pages'

export function App() {
  return (
    <>
      <div id="site-content">
        <Nav />
        <main id="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/collection" element={<Collection />} />
            <Route path="/collection/:slug" element={<Product />} />
            <Route path="/atelier" element={<Atelier />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/journal/:slug" element={<JournalArticle />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <footer className="footer shell">
          <div className="footer__grid">
            <p className="u-headline">SUMI</p>
            <nav aria-label="Footer"><ul className="footer__list">
              {ROUTES.map((route) => <li key={route.to}><SumiLink to={route.to}>{route.label}</SumiLink></li>)}
            </ul></nav>
            <div className="stack"><p>Kyoto. By appointment.</p><a className="link-rule" href={`mailto:${APPOINTMENT_EMAIL}`}>Contact the atelier</a></div>
          </div>
          <p className="footer__colophon">Cloth, ink, and air.</p>
        </footer>
      </div>
      <Bag />
    </>
  )
}
