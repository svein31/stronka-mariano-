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
import {EditorialProvider} from './state/editorial'
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
        <StoreProvider><EditorialProvider>
          <CartProvider><InteractionProvider><TransitionProvider><App /></TransitionProvider></InteractionProvider></CartProvider>
        </EditorialProvider></StoreProvider>
      </CapabilitiesProvider>
    </BrowserRouter>
  </StrictMode>,
)

import './styles/cinematic.css'
import './styles/workshop.css'
import './styles/editorial.css'
import './styles/motion-layers.css'
