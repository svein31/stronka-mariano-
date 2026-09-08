import {useRef} from 'react'
import {useGSAP} from '@gsap/react'
import gsap from 'gsap'
import {useVisualPolicy} from '../lib/capabilities'
import {PhotoPlate} from './PhotoPlate'
import {MagneticLink} from './Interactions'
import {ClothStudy} from './ClothStudy'

export function CinematicHero() {
  const ref=useRef<HTMLElement>(null)
  const policy=useVisualPolicy()
  useGSAP(()=>{
    if(!policy.parallax || !ref.current)return
    const media=gsap.matchMedia()
    media.add('(min-width: 64rem) and (min-height: 700px)',()=>{
      if(!policy.pin)return
      const timeline=gsap.timeline({scrollTrigger:{trigger:ref.current,start:'top top',end:'+=70%',pin:true,scrub:.65,anticipatePin:1,invalidateOnRefresh:true}})
      timeline.to('.hero-depth',{z:100,yPercent:-5,rotateX:3,ease:'none'},0)
        .to('.hero-copy',{y:-35,ease:'none'},0)
        .fromTo('.hero-chapter',{opacity:0,y:20},{opacity:1,y:0,ease:'none'},.35)
    })
    media.add('(max-width: 63.999rem), (max-height: 699px)',()=>{
      gsap.timeline({scrollTrigger:{trigger:ref.current,start:'top top',end:'bottom top',scrub:.5,invalidateOnRefresh:true}})
        .fromTo('.hero-depth',{scale:1.08,yPercent:-2},{scale:1.16,yPercent:5,ease:'none'},0)
        .to('.hero-copy',{y:-24,ease:'none'},0)
    })
    return ()=>media.revert()
  },{scope:ref,dependencies:[policy.pin,policy.parallax],revertOnUpdate:true})
  return <section className="cinematic-hero" ref={ref} aria-labelledby="route-title">
    <div className="hero-depth"><PhotoPlate slot="process" alt="Dłonie odbijające kobaltowy roślinny wzór na jasnych spodniach." eager/></div>
    <div className="hero-atmosphere" aria-hidden="true"/>
    <div className="shell hero-content">
      <div className="hero-copy photo-copy"><p className="eyebrow">Autorski projekt. Własne zasady.</p>
        <h1 id="route-title" tabIndex={-1}>Nie ma<br/>drugiej<br/><em>takiej pary.</em></h1>
        <p>Design tworzony ręcznie.<br/>Gotowe kolekcje z Bangladeszu.</p>
        <div className="hero-actions"><MagneticLink to="/shop">Znajdź swoją parę ↗</MagneticLink><a href="#process" className="text-link">Zobacz proces ↓</a></div>
      </div>
      <p className="hero-chapter">01 / OD ŚLADU DO FORMY</p>
      <span className="hero-provenance">Ilustracja koncepcyjna AI · proces do udokumentowania</span>
    </div>
  </section>
}

export function CraftChapter({title,description}:{title?:string;description?:string}={}) {
  const ref=useRef<HTMLElement>(null)
  const policy=useVisualPolicy()
  useGSAP(()=>{
    if(!policy.parallax || !ref.current)return
    const media=gsap.matchMedia()
    media.add('(min-width: 64rem) and (min-height: 700px)',()=>{
      if(!policy.pin)return
      gsap.timeline({scrollTrigger:{trigger:ref.current,start:'top top',end:'+=85%',pin:true,scrub:.6,invalidateOnRefresh:true}})
        .fromTo('.craft-depth',{z:-100,rotateY:-5},{z:40,rotateY:3,y:-30,ease:'none'},0)
        .fromTo('.craft-word',{y:40,opacity:.45},{y:0,opacity:1,stagger:.18,ease:'none'},0)
    })
    media.add('(max-width: 63.999rem), (max-height: 699px)',()=>{
      gsap.timeline({scrollTrigger:{trigger:ref.current,start:'top bottom',end:'bottom top',scrub:.5,invalidateOnRefresh:true}})
        .fromTo('.craft-depth',{scale:1.1,yPercent:-4},{scale:1.16,yPercent:4,ease:'none'},0)
      gsap.fromTo('.craft-word',{y:26,opacity:.5},{y:0,opacity:1,stagger:.12,duration:.8,ease:'power2.out',scrollTrigger:{trigger:ref.current,start:'top 65%',once:true}})
    })
    return ()=>media.revert()
  },{scope:ref,dependencies:[policy.pin,policy.parallax],revertOnUpdate:true})
  return <section id="process" className="craft-chapter" ref={ref}>
    <div className="craft-depth"><PhotoPlate slot="botanika" alt="Koncepcyjny projekt wzoru Botanika."/><ClothStudy/></div>
    <div className="shell craft-content"><div className="photo-copy"><p className="eyebrow">02 / Siła tkwi w szczególe</p><h2><span className="craft-word">{title||'Własny wzór.'}</span><br/><em className="craft-word">Twój ślad.</em></h2><p>{description||'Ręcznie tworzymy designy. Gotowe spodnie produkują nasi partnerzy w Bangladeszu.'}</p><MagneticLink to="/process">Jak powstają ↗</MagneticLink></div><p className="small chapter-note">Ilustracja koncepcyjna i studium tkaniny 3D.</p></div>
  </section>
}
