/* ==========================================================================
   Build configuration.

   Chunking is the only thing here that needs a decision. The site ships a
   WebGL layer that is heavy and a routing shell that is light, and the two
   must not land in the same file: a visitor reading the journal should never
   download three.js, and a visitor on the home movement should get it as one
   cacheable chunk rather than as forty small ones.

   Vite 8 bundles with Rolldown, which does not support Rollup's object form
   of `manualChunks`. The equivalent is `output.codeSplitting.groups`, matched
   in priority order. Tests use `[\\/]` for the separator so the build behaves
   the same on this machine as it does in CI.
   ========================================================================== */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import brand from './shared/brand.json' with { type: 'json' }

export default defineConfig({
  plugins: [react(), {name:'brand-title', transformIndexHtml: (html: string) => html.replace('WORKSHOP_TITLE', brand.name.replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]!)))}],
  server: {host:'127.0.0.1', port:5173, strictPort:true, proxy:{'/api':{target:'http://127.0.0.1:3001',changeOrigin:false},'/media/uploads':{target:'http://127.0.0.1:3001',changeOrigin:false}}},
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    /* The cloth and warp shaders are inlined template strings, so nothing in
       src produces an asset. Keeping the limit low avoids base64-ing the two
       fonts' woff2 files into the CSS, where they would be re-downloaded on
       every route change. */
    assetsInlineLimit: 2048,
    rolldownOptions: {
      output: {
        codeSplitting: {
          /* Deliberately no minSize. The groups below are split by what the
             visitor is doing, not by weight, and a small group is still the
             right group. */
          groups: [
            {
              name: 'webgl',
              test: /node_modules[\\/](three|three-stdlib|@react-three|@use-gesture|maath|camera-controls)[\\/]/,
              priority: 40,
            },
            {
              name: 'motion',
              test: /node_modules[\\/](gsap|lenis)[\\/]/,
              priority: 30,
            },
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/,
              // Claim shared React dependencies before the WebGL group can
              // absorb them and force every route to import the renderer.
              priority: 50,
            },
            {
              /* Anything else a dependency drags in. Catching it here keeps
                 the three groups above honest about what they contain. */
              name: 'vendor',
              test: /node_modules[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
})
