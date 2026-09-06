import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { build, createServer } from 'vite'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

// Evaluate the project's TSX with its own compiler. No browser or dev listener
// is needed to verify that the unenhanced route document is complete.
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
after(() => server.close())
const { App } = await server.ssrLoadModule('/src/App.tsx')
const { CapabilitiesProvider, motionBudgetFor } = await server.ssrLoadModule('/src/lib/capabilities.tsx')
const { CartProvider, useCart } = await server.ssrLoadModule('/src/state/cart.tsx')
const { TransitionProvider } = await server.ssrLoadModule('/src/components/Transition.tsx')
const { InkPlate } = await server.ssrLoadModule('/src/components/InkPlate.tsx')
const { markResolved } = await server.ssrLoadModule('/src/lib/media.ts')
const { garments } = await server.ssrLoadModule('/src/data/collection.ts')
const { journal } = await server.ssrLoadModule('/src/data/journal.ts')
const { detectWebGL } = await server.ssrLoadModule('/src/lib/motion.ts')

function renderRoute(path) {
  return renderToStaticMarkup(h(MemoryRouter, { initialEntries: [path] },
    h(CapabilitiesProvider, null, h(CartProvider, null,
      h(TransitionProvider, null, h(App))))))
}

for (const [path, title] of [
  ['/', 'Cloth, ink,'], ['/collection', 'Utsuroi'], ['/atelier', 'The atelier'], ['/journal', 'Journal'],
  ...garments.map((garment) => [`/collection/${garment.slug}`, garment.name]),
  ...journal.map((entry) => [`/journal/${entry.slug}`, entry.title]),
  ['/unknown', 'This page is absent.'], ['/collection/unknown', 'This page is absent.'],
  ['/journal/unknown', 'This page is absent.'],
]) {
  test(`Static document resolves ${path}`, () => {
    const html = renderRoute(path)
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1)
    assert.match(html, /id="route-title" tabindex="-1"/)
    assert.ok(html.includes(title))
    assert.match(html, /<main id="main-content">/)
    assert.doesNotMatch(html, /<canvas/)
  })
}

test('Collection query filters garments and invalid values resolve to the complete collection', () => {
  const filtered = renderRoute('/collection?c=outerwear')
  for (const garment of garments) {
    assert.equal(filtered.includes(`id="garment-${garment.slug}"`), garment.category === 'outerwear')
  }
  const all = renderRoute('/collection?c=absent')
  for (const garment of garments) assert.ok(all.includes(`id="garment-${garment.slug}"`))
})

test('Product material, size selection and bag entry do not depend on WebGL', () => {
  const garment = garments[0]
  const html = renderRoute(`/collection/${garment.slug}`)
  for (const text of [garment.composition, garment.origin, garment.care, garment.cloth.weight]) assert.ok(html.includes(text))
  assert.match(html, /id="garment-size"[^>]*required/)
  assert.match(html, /Add to bag/)
  assert.match(html, /No payment is taken here/)
})

test('High device tier never overrides missing WebGL or reduced motion', () => {
  for (const tier of ['low', 'high']) {
    assert.equal(motionBudgetFor({ tier, webgl: false, reducedMotion: false }).enabled, false)
    assert.equal(motionBudgetFor({ tier, webgl: true, reducedMotion: true }).enabled, false)
  }
  assert.equal(motionBudgetFor({ tier: 'low', webgl: true, reducedMotion: false }).clothSegments, 64)
  assert.equal(motionBudgetFor({ tier: 'high', webgl: true, reducedMotion: false }).clothSegments, 128)
})

test('An unresolved photograph actually mounts its loading image; a cached miss has a labelled fallback', () => {
  const probing = renderToStaticMarkup(h(InkPlate, { slot: 'regression-probe', alt: 'Wool overcoat.' }))
  assert.match(probing, /<img[^>]*src="\/media\/regression-probe.jpg"/)
  assert.match(probing, /visibility:hidden/)
  markResolved('regression-missing', null)
  const missing = renderToStaticMarkup(h(InkPlate, { slot: 'regression-missing', alt: 'Wool overcoat.' }))
  assert.doesNotMatch(missing, /<img/)
  assert.match(missing, /Photograph unavailable. Wool overcoat./)
  assert.match(missing, /Photograph forthcoming/)
})

test('Persisted bag restores canonical prices and rejects invalid variants and quantities', () => {
  const garment = garments[0]
  const line = { slug: garment.slug, size: garment.sizes[0], colour: garment.colourways[0].name, quantity: 2, price: 1 }
  const previousWindow = globalThis.window
  globalThis.window = { localStorage: { getItem: () => JSON.stringify([
    line, { ...line, size: 'absent' }, { ...line, quantity: -1 }, { ...line, quantity: 2.5 }, { ...line, quantity: 100 },
  ]) } }
  function Probe() {
    const cart = useCart()
    assert.equal(cart.count, 2)
    assert.equal(cart.total, garment.price * 2)
    assert.equal(cart.lines[0].name, garment.name)
    return null
  }
  try { renderToStaticMarkup(h(CartProvider, null, h(Probe))) }
  finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
})

test('A WebGL 1-only device is rejected by the WebGL 2 renderer gate', () => {
  const previousWindow = globalThis.window
  const previousDocument = globalThis.document
  const requests = []
  globalThis.window = {}
  globalThis.document = { createElement: () => ({ getContext: (kind) => { requests.push(kind); return null } }) }
  try {
    assert.equal(detectWebGL(), false)
    assert.deepEqual(requests, ['webgl2'])
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
    if (previousDocument === undefined) delete globalThis.document
    else globalThis.document = previousDocument
  }
})


test('Production entry graph does not eagerly download the optional Three renderer', async () => {
  const result = await build({ logLevel: 'silent', build: { write: false } })
  const output = Array.isArray(result) ? result.flatMap((bundle) => bundle.output) : result.output
  const chunks = new Map(output.filter((item) => item.type === 'chunk').map((chunk) => [chunk.fileName, chunk]))
  const visited = new Set()
  const containsRenderer = (chunk) => Object.keys(chunk.modules).some((id) => /node_modules[\\/](?:three|@react-three)[\\/]/.test(id))
  function visit(chunk) {
    if (visited.has(chunk.fileName)) return
    visited.add(chunk.fileName)
    assert.equal(containsRenderer(chunk), false, `${chunk.fileName} eagerly contains WebGL`)
    for (const dependency of chunk.imports) {
      if (chunks.has(dependency)) visit(chunks.get(dependency))
    }
  }
  for (const chunk of chunks.values()) if (chunk.isEntry) visit(chunk)
  assert.ok([...chunks.values()].some((chunk) => !visited.has(chunk.fileName) && containsRenderer(chunk)))
})
