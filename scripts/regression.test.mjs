import assert from 'node:assert/strict'
import {after,test} from 'node:test'
import {existsSync} from 'node:fs'
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
const {InteractionProvider}=await server.ssrLoadModule('/src/components/Interactions.tsx')
const {visualPolicyFor}=await server.ssrLoadModule('/src/lib/visual-policy.ts')
const {PhotoPlate}=await server.ssrLoadModule('/src/components/PhotoPlate.tsx')
const {ProductGallery,SizeAssistant}=await server.ssrLoadModule('/src/components/ProductTools.tsx')
const {recommendSize}=await server.ssrLoadModule('/src/lib/sizing.ts')
const {garments,filterGarments,sortGarments}=await server.ssrLoadModule('/src/data/collection.ts')
const {entries}=await server.ssrLoadModule('/src/data/journal.ts')
const {detectWebGL}=await server.ssrLoadModule('/src/lib/motion.ts')
const {api,ApiError}=await server.ssrLoadModule('/src/lib/api.ts')
const {readPending}=await server.ssrLoadModule('/src/routes/Checkout.tsx')
function renderRoute(path) {
 return renderToStaticMarkup(h(MemoryRouter,{initialEntries:[path]},h(CapabilitiesProvider,null,h(CartProvider,null,h(StoreProvider,null,h(InteractionProvider,null,h(TransitionProvider,null,h(App))))))))
}
for(const [path,title] of [
['/','Nie ma'],['/shop','Wybierz swój ślad.'],['/collection','Wybierz swój ślad.'],['/process','Od kawałka płótna.'],['/atelier','Od kawałka płótna.'],['/journal','Pomiędzy szwami.'],
['/cart','Twoje wybory.'],['/checkout','Twoja para. Twoje dane.'],['/order-confirmation','Twoje potwierdzenie.'],['/faq','Dobrze wiedzieć.'],['/size-guide','Zmierz. Sprawdź. Zapisz.'],['/contact','Porozmawiajmy o parze.'],['/terms','Warunki zamówienia.'],['/privacy','Twoja prywatność.'],['/shipping-returns','Dostawa i zwroty.'],
['/admin','Twoja pracownia.'],['/track','Wszystkie ustalenia. Jedno miejsce.'],['/newsletter','Twój wybór wiadomości.'],['/personalize/botanika','Para według Twoich wymiarów.'],
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
 // Motion subscribes to resize when a window exists; this storage-only fixture
 // provides that event interface. It does not assert browser layout or gestures.
 try {globalThis.window=Object.assign(new EventTarget(),{innerWidth:1280,localStorage:{getItem:()=>JSON.stringify([line])}});const html=renderRoute('/checkout');assert.match(html,/name="street"/);assert.match(html,/name="postalCode"/);assert.match(html,/name="shipping"/);assert.match(html,/Zapisz zamówienie bez płatności/)}
 finally{if(prior===undefined)delete globalThis.window;else globalThis.window=prior}
})
test('Photograph probes a real URL and keeps a descriptive fallback',()=>{
 const html=renderToStaticMarkup(h(PhotoPlate,{slot:'missing',alt:'Lniane spodnie z nadrukiem.'}))
 assert.match(html,/src="\/media\/missing.webp"/);assert.match(html,/opacity:0/);assert.match(html,/role="img" aria-label="Lniane spodnie z nadrukiem."/);assert.match(html,/Fotografia chwilowo niedostępna/)
 const hero=renderToStaticMarkup(h(PhotoPlate,{slot:'botanika',alt:'Bawełniane spodnie.',eager:true}))
 assert.match(hero,/srcSet=/);assert.match(hero,/loading="eager"/);assert.match(hero,/width="1086" height="1448"/)
})
test('Automatic effects respect hardware, data and accessibility limits',()=>{
 for(const tier of ['low','medium','high']) for(const webgl of [false,true]) for(const reducedMotion of [false,true]) for(const saveData of [false,true]) {
  const capabilities={tier,webgl,reducedMotion,saveData,reducedTransparency:false}
  const budget=motionBudgetFor(capabilities),policy=visualPolicyFor(capabilities)
  const enabled=tier!=='low'&&webgl&&!reducedMotion&&!saveData
  assert.equal(budget.enabled,enabled);assert.equal(policy.depth,enabled)
  if(!enabled)assert.equal(budget.clothSegments,0)
  if(reducedMotion||tier==='low'||saveData) for(const effect of ['depth','pin','parallax','glass','magnetic'])assert.equal(policy[effect],false,effect)
 }
 const high={tier:'high',webgl:true,reducedMotion:false}
 assert.equal(motionBudgetFor(high).enabled,true)
 assert.equal(motionBudgetFor({...high,tier:'medium'}).clothSegments,48)
 assert.deepEqual(motionBudgetFor({...high,tier:'medium'}).dpr,[1,1.25])
 assert.equal(visualPolicyFor({...high,tier:'medium',saveData:false}).pin,false)
 assert.equal(motionBudgetFor(high).clothSegments,96)
 assert.deepEqual(motionBudgetFor(high).dpr,[1,1.5])
})
test('Reduced transparency and reduced motion independently control glass and interactions',()=>{
 const high={tier:'high',webgl:true,reducedMotion:false,saveData:false,reducedTransparency:false}
 assert.equal(visualPolicyFor(high).glass,true);assert.equal(visualPolicyFor(high).pin,true)
 const transparent=visualPolicyFor({...high,reducedTransparency:true})
 assert.equal(transparent.glass,false);assert.equal(transparent.depth,true)
 assert.equal(visualPolicyFor({...high,reducedMotion:true}).componentMotion,false)
 assert.equal(visualPolicyFor({...high,reducedMotion:true}).depth,false)
})
test('Sorting filtered products preserves catalog order and is reflected in the URL document',()=>{
 const before=garments.map(p=>p.slug)
 assert.deepEqual(sortGarments(garments,'price-asc').map(p=>p.price),garments.map(p=>p.price).sort((a,b)=>a-b))
 assert.deepEqual(sortGarments(garments,'price-desc').map(p=>p.price),garments.map(p=>p.price).sort((a,b)=>b-a))
 assert.deepEqual(sortGarments(garments,'unknown').map(p=>p.slug),before)
 assert.deepEqual(garments.map(p=>p.slug),before)
 const filtered=filterGarments(new URLSearchParams('material=Len'))
 assert.equal(sortGarments(filtered,'price-asc').length,filtered.length)
 assert.match(renderRoute('/shop?sort=price-desc'),/<option value="price-desc" selected="">/)
})
test('White studio photography ships all responsive sizes and remains visible in the static gallery',()=>{
 for(const product of garments) {
  const slot=product.slot+'-studio'
  for(const suffix of ['','-480','-960'])assert.ok(existsSync(new URL('../public/media/'+slot+suffix+'.webp',import.meta.url)))
  const html=renderRoute('/shop/'+product.slug)
  assert.ok(html.includes('/media/'+slot+'.webp'))
  assert.doesNotMatch(html,/<figure[^>]*style="opacity:0/)
 }
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

test('Size assistant requires verified model measurements and explains fitting or no-match results',()=>{
 const input={waist:78,hips:98,inseam:76,fit:'regular'}
 assert.equal(recommendSize(garments[0],input).size,null)
 const model={...garments[0],measurementsVerified:true,measurements:[{size:'M',waist:82,hips:106,inseam:76},{size:'L',waist:86,hips:112,inseam:77}]}
 assert.equal(recommendSize(model,input).size,'M')
 assert.equal(recommendSize(model,{...input,fit:'relaxed'}).size,'L')
 assert.equal(recommendSize(model,{...input,waist:200}).size,null)
 assert.match(recommendSize(model,input).message,/4 cm zapasu/)
 assert.match(renderToStaticMarkup(h(MemoryRouter,null,h(SizeAssistant,{product:garments[0]}))),/po zatwierdzeniu rzeczywistych pomiarów/)
})
test('Owner variants determine gallery imagery and restored cart price',()=>{
 const product={...garments[0],variants:['New variant'],price:65000,gallery:[{src:'/media/forma.webp',alt:'Fixture variant photo',variant:'New variant',kind:'detail'},{src:'/media/gest.webp',alt:'Other variant photo',variant:'Other',kind:'full'}]}
 const html=renderToStaticMarkup(h(ProductGallery,{product,variant:'New variant'}))
 assert.match(html,/\/media\/forma.webp/);assert.doesNotMatch(html,/\/media\/gest.webp/)
 const cart=normalizeCart([{...line,variant:'New variant'}],[product])
 assert.equal(cart[0].price,65000);assert.equal(cart[0].variant,'New variant')
 assert.match(renderRoute('/shop'),/Szybki podgląd/)
})
