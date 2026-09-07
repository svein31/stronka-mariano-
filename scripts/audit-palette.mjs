import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const css=readFileSync(new URL('../src/styles/tokens.css',import.meta.url),'utf8')
const surfaces=readFileSync(new URL('../src/styles/cinematic.css',import.meta.url),'utf8')
const shader=readFileSync(new URL('../src/components/three/shaders/palette.ts',import.meta.url),'utf8')
const colors=Object.fromEntries([...css.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/g)].map(m=>[m[1],m[2]]))
function luminance(hex) {
 const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4)
 return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722
}
const ratio=(a,b)=>{const hi=Math.max(luminance(a),luminance(b)),lo=Math.min(luminance(a),luminance(b));return (hi+.05)/(lo+.05)}
const pairs=[
 ['canvas','night',7],['canvas','panel',7],['muted-inverse','night',4.5],['muted-inverse','panel',4.5],
 ['charcoal','canvas',7],['charcoal','ecru',7],['muted','canvas',4.5],['muted','ecru',4.5],
 ['charcoal','accent',7],['accent','night',4.5],['canvas','glass-worst',7],['muted-inverse','glass-worst',4.5],
 ['canvas','story-worst',7],['muted-inverse','story-worst',4.5],
 ['line','canvas',3],['line','ecru',3],['line','night',3],['line','panel',3],['line','glass-worst',3],
]
for(const [fg,bg,min] of pairs) {
 const actual=ratio(colors[fg],colors[bg]);assert.ok(actual>=min,fg+' / '+bg+' fails: '+actual)
 console.log(fg+' / '+bg+': '+actual.toFixed(2)+' ≥ '+min)
}
// Test both extreme backdrops using the actual CSS scrims. Channel monotonicity
// bounds every photograph in between; no dependence on a particular image.
for(const [name,alpha] of [['glass',.94],['story',.86]]) {
 const scrims=[...surfaces.matchAll(/rgba\(\s*12\s*,\s*13\s*,\s*16\s*,\s*([.\d]+)\s*\)/g)].map(match=>Number(match[1]))
 assert.ok(scrims.includes(alpha),name+' scrim changed: update audit')
 for(const backdrop of [0,255]) {
  const blended='#'+[12,13,16].map(c=>Math.ceil(c*alpha+backdrop*(1-alpha)).toString(16).padStart(2,'0')).join('')
  for(const fg of ['canvas','muted-inverse']) assert.ok(ratio(colors[fg],blended)>=4.5,name+' backdrop contrast failed')
 }
}
for(const name of ['canvas','ecru','charcoal','muted','line']) assert.ok(shader.includes(name+":'"+colors[name]+"'"),'Shader drift: '+name)
console.log(pairs.length+' token contrast checks, 8 backdrop checks and 5 shader comparisons pass.')
