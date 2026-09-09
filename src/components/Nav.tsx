

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {motion} from 'motion/react'
import {GlassGlint} from './Interactions'
import { useCapabilities } from '../lib/capabilities'
import { useFocusTrap } from '../lib/focus'
import { useCart } from '../state/cart'
import { SiteLink, useTransitioning } from './Transition'
import brand from '../../shared/brand.json'
import {useTravel} from './Transition'
import { ROUTES,EXPLORE_ROUTES } from '../routes/manifest'

const SCRIM_AT = 64

export function Nav() {
  const location = useLocation()
  const traveling = useTransitioning()
  const { scroll, reducedMotion } = useCapabilities()
  const { count, setOpen } = useCart()
  const travel=useTravel()

  const shell = useRef<HTMLElement>(null)
  const progress = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const [open, setOpenPanel] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const trigger = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        if (progress.current) {
          progress.current.style.transform = `scaleX(${self.progress.toFixed(4)})`
        }
        setScrolled(self.scroll() > SCRIM_AT)
      },
    })

    return () => trigger.kill()
  }, [])

  const close = useCallback(() => setOpenPanel(false), [])

  useFocusTrap(panel, open, { onEscape: close })

  useEffect(() => {
    if (!open) return
    const background = [shell.current, document.getElementById('main-content'), document.querySelector('footer')]
    const prior = background.map((element) => element?.inert ?? false)
    background.forEach((element) => { if (element) element.inert = true })
    scroll.stop()
    return () => {
      background.forEach((element, index) => { if (element) element.inert = prior[index] })
      scroll.start()
    }
  }, [open, scroll])

  // A route change means the panel has done its job.
  useEffect(() => {
    setOpenPanel(false)
  }, [location.pathname, location.search])

  const isActive = (match: string): boolean => location.pathname.startsWith(match)

  return (
    <>
      <a className="skip-link" href="#route-title">
        Przejdź do treści
      </a>

      <header className="nav glass" ref={shell} data-scrolled={scrolled} data-traveling={traveling}>
        <GlassGlint/>
        <SiteLink to="/" className="nav__wordmark" aria-label={brand.name + ', strona główna'}>

          <span aria-hidden="true">{brand.name.toLowerCase()}</span>
        </SiteLink>

        <nav className="nav__links" aria-label="Główna">
          {ROUTES.map((route) => (
            <SiteLink
              key={route.to}
              to={route.to}
              className="nav__link"
              aria-current={isActive(route.match) ? 'page' : undefined}
            >
              {route.label}
            </SiteLink>
          ))}
        </nav>

        <div className="nav__actions">
          <button
            type="button"
            className="nav__bag"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
          >
            Koszyk
            <span className="nav__bag-count" aria-hidden="true">
              {String(count).padStart(2, '0')}
            </span>
            <span className="sr-only">
              {', liczba sztuk: ' + count}
            </span>
          </button>

          <button
            type="button"
            className="nav__toggle"
            ref={toggle}
            aria-expanded={open}
            aria-controls="nav-panel"
            onClick={() => setOpenPanel((current) => !current)}
          >
            <span className="nav__bar nav__bar--top" aria-hidden="true" />
            <span className="nav__bar nav__bar--bottom" aria-hidden="true" />
            <span className="sr-only">{open ? 'Zamknij menu' : 'Otwórz menu'}</span>
          </button>
        </div>

        <div className="nav__progress" ref={progress} aria-hidden="true" />
      </header>

      <motion.div
        initial={false}
        animate={{opacity:open?1:0,y:open?0:16}}
        transition={{duration:reducedMotion?0:.24}}
        aria-hidden={!open}
        className="nav-panel glass"
        id="nav-panel"
        ref={panel}
        data-open={open}
        role="dialog"
        aria-modal={open ? 'true' : undefined}
        aria-label="Menu"
        inert={!open}
        tabIndex={-1}
        data-lenis-prevent
      >
        <button className="nav-panel__close link-rule" type="button" onClick={close}>Zamknij menu</button>
        <form className="nav-panel__search" onSubmit={e=>{e.preventDefault();const q=String(new FormData(e.currentTarget).get('q')||'');setOpenPanel(false);travel('/shop?q='+encodeURIComponent(q))}}><label className="field">Szukaj modelu<input name="q" type="search" placeholder="Nazwa, materiał, wzór" maxLength={100}/></label><button type="submit">Szukaj</button></form><nav aria-label="Strony">
          <ul className="nav-panel__list">
            {ROUTES.map((route) => (
              <li className="nav-panel__item" key={route.to}>
                <SiteLink
                  to={route.to}
                  className="nav-panel__link"
                  aria-current={isActive(route.match) ? 'page' : undefined}
                  tabIndex={open ? undefined : -1}
                >
                  <span className="nav-panel__index">{route.index}</span>
                  <span className="nav-panel__label">{route.label}</span>

                </SiteLink>
              </li>
            ))}
          </ul>
        </nav><nav className="nav-panel__extras" aria-label="Odkrywaj">{EXPLORE_ROUTES.map(r=><SiteLink key={r.to} to={r.to}>{r.label}</SiteLink>)}</nav><SiteLink className="nav-panel__campaign" to="/lookbook"><img src="/media/forma-studio.webp" alt="Koncepcyjny model Forma" width="480" height="640" loading="lazy"/>Lookbook</SiteLink>
      </motion.div>
    </>
  )
}
