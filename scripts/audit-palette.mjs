import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const css=readFileSync(new URL('../src/styles/tokens.css',import.meta.url),'utf8')
const shader=readFileSync(new URL('../src/components/three/shaders/palette.ts',import.meta.url),'utf8')
const colors=Object.fromEntries([...css.matchAll(/--([a-z]+):\s*(#[0-9a-f]{6})/g)].map(m=>[m[1],m[2]]))
function luminance(hex) {
 const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4)
 return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722
}
let checks=0
for(const background of ['canvas','ecru']) for(const foreground of ['charcoal','muted','indigo','clay','line']) {
 const [hi,lo]=[luminance(colors[background]),luminance(colors[foreground])].sort((a,b)=>b-a)
 const ratio=(hi+.05)/(lo+.05),minimum=foreground==='line'?3:foreground==='charcoal'?7:4.5
 assert.ok(ratio>=minimum,foreground+' on '+background+' fails')
 console.log(foreground+' / '+background+': '+ratio.toFixed(2)+' ≥ '+minimum)
 checks++
}
for(const [name,color] of Object.entries(colors)) assert.ok(shader.includes(name+":'"+color+"'"),'Shader drift: '+name)
console.log(checks+' contrast checks and '+Object.keys(colors).length+' shader tokens pass.')
