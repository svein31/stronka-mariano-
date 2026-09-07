

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useCapabilities } from '../lib/capabilities'
import { useFocusTrap } from '../lib/focus'
import { EASE } from '../lib/motion'
import { useCart } from '../state/cart'
import { SiteLink, useTransitioning } from './Transition'
import brand from '../../shared/brand.json'
import { ROUTES } from '../routes/manifest'

const SCRIM_AT = 64

export function Nav() {
  const location = useLocation()
  const traveling = useTransitioning()
  const { scroll, reducedMotion, systemReducedMotion, motionPaused, setMotionPaused } = useCapabilities()
  const { count, setOpen } = useCart()

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

  useEffect(() => {
    const query = window.matchMedia('(min-width: 56.001rem)')
    const onChange = () => { if (query.matches) setOpenPanel(false) }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  // A route change means the panel has done its job.
  useEffect(() => {
    setOpenPanel(false)
  }, [location.pathname, location.search])

  useGSAP(
    () => {
      if (!open || reducedMotion || !panel.current) return

      gsap.fromTo(
        panel.current.querySelectorAll('.nav-panel__item'),
        { y: 56, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.85,
          ease: EASE.outExpo,
          stagger: 0.07,
          delay: 0.08,
        },
      )
    },
    { scope: panel, revertOnUpdate: true, dependencies: [open, reducedMotion] },
  )

  const isActive = (match: string): boolean => location.pathname.startsWith(match)

  return (
    <>
      <a className="skip-link" href="#route-title">
        Przejdź do treści
      </a>

      <header className="nav" ref={shell} data-scrolled={scrolled} data-traveling={traveling}>
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
            className="nav__motion"
            type="button"
            aria-pressed={reducedMotion}
            disabled={systemReducedMotion}
            onClick={() => setMotionPaused(!motionPaused)}
          >
            {systemReducedMotion ? 'Bez animacji' : (motionPaused ? 'Wznów ruch' : 'Pauza ruchu')}
          </button>
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

      <div
        className="nav-panel"
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
        <nav aria-label="Strony">
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
        </nav>
      </div>
    </>
  )
}
