import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { registerMotion } from './lib/motion'
import { CapabilitiesProvider } from './lib/capabilities'
import { CartProvider } from './state/cart'
import { TransitionProvider } from './components/Transition'
import { StoreProvider } from './state/store'
import {InteractionProvider} from './components/Interactions'
import { App } from './App'
import './styles/base.css'
import './styles/components.css'
import './styles/pages.css'

registerMotion()
gsap.registerPlugin(useGSAP)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CapabilitiesProvider>
        <CartProvider>
          <StoreProvider><InteractionProvider><TransitionProvider><App /></TransitionProvider></InteractionProvider></StoreProvider>
        </CartProvider>
      </CapabilitiesProvider>
    </BrowserRouter>
  </StrictMode>,
)

import './styles/cinematic.css'
