import assert from 'node:assert/strict'
import {after,test} from 'node:test'
import {build,createServer} from 'vite'
import {createElement as h} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {MemoryRouter} from 'react-router-dom'
// Preserve the existing SSR regression approach; no synthetic browser assertions.
const server=await createServer({server:{middlewareMode:true},appType:'custom'})
after(()=>server.close())
const {App}=await server.ssrLoadModule('/src/App.tsx')
const {CapabilitiesProvider,motionBudgetFor}=await server.ssrLoadModule('/src/lib/capabilities.tsx')
const {CartProvider,normalizeCart,readCart,toOrderLines,consumeCart}=await server.ssrLoadModule('/src/state/cart.tsx')
const {StoreProvider}=await server.ssrLoadModule('/src/state/store.tsx')
const {TransitionProvider}=await server.ssrLoadModule('/src/components/Transition.tsx')
const {PhotoPlate}=await server.ssrLoadModule('/src/components/PhotoPlate.tsx')
const {garments,filterGarments}=await server.ssrLoadModule('/src/data/collection.ts')
const {entries}=await server.ssrLoadModule('/src/data/journal.ts')
const {detectWebGL}=await server.ssrLoadModule('/src/lib/motion.ts')
const {api,ApiError}=await server.ssrLoadModule('/src/lib/api.ts')
const {readPending}=await server.ssrLoadModule('/src/routes/Checkout.tsx')
function renderRoute(path) {
 return renderToStaticMarkup(h(MemoryRouter,{initialEntries:[path]},h(CapabilitiesProvider,null,h(CartProvider,null,h(StoreProvider,null,h(TransitionProvider,null,h(App)))))))
}
for(const [path,title] of [
['/','Nie ma'],['/shop','Wybierz swój ślad.'],['/collection','Wybierz swój ślad.'],['/process','Od kawałka płótna.'],['/atelier','Od kawałka płótna.'],['/journal','Pomiędzy szwami.'],
['/cart','Twoje wybory.'],['/checkout','Twoja para. Twoje dane.'],['/order-confirmation','Twoje potwierdzenie.'],['/faq','Dobrze wiedzieć.'],['/size-guide','Zacznij od miarki.'],['/contact','Porozmawiajmy o parze.'],['/terms','Warunki zamówienia.'],['/privacy','Twoja prywatność.'],['/shipping-returns','Dostawa i zwroty.'],
...garments.map(g=>['/shop/'+g.slug,g.name]),...garments.map(g=>['/collection/'+g.slug,g.name]),...entries.map(e=>['/journal/'+e.slug,e.title]),
...['/404','/unknown','/shop/unknown','/journal/unknown'].map(p=>[p,'Ta strona się spruła.'])
]) test('Complete static document: '+path,()=>{
 const html=renderRoute(path)
 assert.equal((html.match(/<h1\b/g)||[]).length,1)
 assert.match(html,/id="route-title" tabindex="-1"/)
 assert.ok(html.includes(title));assert.match(html,/<main id="main-content">/);assert.doesNotMatch(html,/<canvas/)
})
test('Material, technique and size filters combine and support no matches',()=>{
 assert.deepEqual(filterGarments(new URLSearchParams('material=Len&size=M')).map(p=>p.slug),['forma'])
 assert.deepEqual(filterGarments(new URLSearchParams('material=Len&print=Pędzel')),[])
 assert.equal(filterGarments(new URLSearchParams()).length,3)
 assert.match(renderRoute('/shop?material=absent'),/Nie ma pary pasującej/)
})
test('Garment selection and care remain usable without a renderer',()=>{
 const html=renderRoute('/shop/botanika')
 assert.ok(html.includes(garments[0].care));assert.ok(html.includes(garments[0].composition))
 assert.match(html,/<input(?=[^>]*name="size")(?=[^>]*required)[^>]*>/);assert.match(html,/name="variant"/)
 assert.match(html,/Dodaj do koszyka/);assert.match(html,/Płatności wyłączone/)
})
const line={slug:'botanika',size:'M',variant:'Kobalt / ecru',quantity:2}
test('Cart restores canonical prices and rejects malformed variants',()=>{
 const lines=normalizeCart([line,{...line,size:'UNKNOWN'},{...line,quantity:-1},{...line,quantity:1.5},{...line,variant:'other'}])
 assert.equal(lines.length,1);assert.equal(lines[0].price,49000);assert.equal(lines[0].quantity,2)
 assert.equal(normalizeCart([{...line,price:1}])[0].price,49000)
 assert.equal(normalizeCart([line,{...line,quantity:10}])[0].quantity,10)
 assert.deepEqual(toOrderLines(lines),[line]);assert.deepEqual(normalizeCart(null),[])
})
test('Saved cart is restored; inaccessible or corrupt storage does not break routes',()=>{
 const prior=globalThis.window
 try {
 globalThis.window={localStorage:{getItem:()=>JSON.stringify([line])}}
 assert.equal(readCart()[0].quantity,2)
 globalThis.window={localStorage:{getItem:()=>'{broken'}};assert.deepEqual(readCart(),[])
 globalThis.window={localStorage:{getItem:()=>{throw Error('blocked')}}};assert.deepEqual(readCart(),[])
 }finally{if(prior===undefined)delete globalThis.window;else globalThis.window=prior}
})
test('Checkout recovery ignores malformed session data',()=>{
 const prior=globalThis.sessionStorage
 try {globalThis.sessionStorage={getItem:()=>JSON.stringify({customer:{}})};assert.equal(readPending(),null)}
 finally{if(prior===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=prior}
})
test('Checkout document with a saved cart has address, delivery and acknowledgement',()=>{
 const prior=globalThis.window
 try {globalThis.window={localStorage:{getItem:()=>JSON.stringify([line])}};const html=renderRoute('/checkout');assert.match(html,/name="street"/);assert.match(html,/name="postalCode"/);assert.match(html,/name="shipping"/);assert.match(html,/Zapisz zamówienie bez płatności/)}
 finally{if(prior===undefined)delete globalThis.window;else globalThis.window=prior}
})
test('Photograph probes a real URL and keeps a descriptive fallback',()=>{
 const html=renderToStaticMarkup(h(PhotoPlate,{slot:'missing',alt:'Lniane spodnie z nadrukiem.'}))
 assert.match(html,/src="\/media\/missing.webp"/);assert.match(html,/opacity:0/);assert.match(html,/role="img" aria-label="Lniane spodnie z nadrukiem."/);assert.match(html,/Fotografia chwilowo niedostępna/)
 const hero=renderToStaticMarkup(h(PhotoPlate,{slot:'botanika',alt:'Bawełniane spodnie.',eager:true}))
 assert.match(hero,/srcSet=/);assert.match(hero,/loading="eager"/);assert.match(hero,/width="1086" height="1448"/)
})
test('High device tier never bypasses unavailable WebGL or reduced motion',()=>{
 for(const tier of ['low','high']) {assert.equal(motionBudgetFor({tier,webgl:false,reducedMotion:false}).enabled,false);assert.equal(motionBudgetFor({tier,webgl:true,reducedMotion:true}).enabled,false)}
 assert.equal(motionBudgetFor({tier:'low',webgl:true,reducedMotion:false}).clothSegments,64)
 assert.equal(motionBudgetFor({tier:'high',webgl:true,reducedMotion:false}).clothSegments,128)
})
test('WebGL 1-only devices do not mount a WebGL 2 renderer',()=>{
 const previousWindow=globalThis.window,previousDocument=globalThis.document,requests=[]
 globalThis.window={};globalThis.document={createElement:()=>({getContext:kind=>{requests.push(kind);return null}})}
 try{assert.equal(detectWebGL(),false);assert.deepEqual(requests,['webgl2'])}
 finally{if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument}
})
test('API propagates checkout failures and never treats invalid JSON as a receipt',async()=>{
 const prior=globalThis.fetch
 try {
 globalThis.fetch=async()=>{throw Error('offline')};await assert.rejects(api('/api/orders'),e=>e instanceof ApiError&&e.status===0)
 globalThis.fetch=async()=>new Response(JSON.stringify({error:'Try again'}),{status:503});await assert.rejects(api('/api/orders'),e=>e.status===503)
 globalThis.fetch=async()=>new Response('<html/>',{status:200});await assert.rejects(api('/api/orders'),e=>e.status===0)
 }finally{globalThis.fetch=prior}
})
test('Confirmation without its private key never claims an order was paid',()=>{
 const html=renderRoute('/order-confirmation')
 assert.match(html,/Nie ma zapisanego potwierdzenia/)
 assert.doesNotMatch(html,/Zamówienie opłacone/)
})
test('Production entry graph does not eagerly download Three',async()=>{
 const result=await build({logLevel:'silent',build:{write:false}})
 const output=Array.isArray(result)?result.flatMap(b=>b.output):result.output
 const chunks=new Map(output.filter(i=>i.type==='chunk').map(c=>[c.fileName,c])),visited=new Set()
 const renderer=c=>Object.keys(c.modules).some(id=>/node_modules[\\/](?:three|@react-three)[\\/]/.test(id))
 function visit(chunk){if(visited.has(chunk.fileName))return;visited.add(chunk.fileName);assert.equal(renderer(chunk),false,chunk.fileName);for(const dep of chunk.imports)if(chunks.has(dep))visit(chunks.get(dep))}
 for(const c of chunks.values())if(c.isEntry)visit(c)
 assert.ok([...chunks.values()].some(c=>!visited.has(c.fileName)&&renderer(c)))
})

test('Successful checkout preserves items added after the submitted request',()=>{
 const added={slug:'forma',size:'M',variant:'Glina / len',quantity:1}
 const latest=normalizeCart([{...line,quantity:3},added])
 const remaining=consumeCart(latest,[line])
 assert.equal(remaining.find(l=>l.slug==='botanika').quantity,1)
 assert.equal(remaining.find(l=>l.slug==='forma').quantity,1)
 assert.deepEqual(consumeCart(normalizeCart([line]),[line]),[])
})
