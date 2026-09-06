import { useState, type FormEvent, type ReactNode } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Movement } from '../components/Movement'
import { InkPlate } from '../components/InkPlate'
import { Rise } from '../components/ScrollMotion'
import { ClothStudy } from '../components/ClothStudy'
import { SumiLink, useDocumentTitle } from '../components/Transition'
import { garments, garmentBySlug, categoriesInUse, CATEGORY_LABELS, formatPrice, type Garment } from '../data/collection'
import { house, process } from '../data/atelier'
import { journal, entryBySlug, formatDate } from '../data/journal'
import { useCart } from '../state/cart'
import { APPOINTMENT_EMAIL, CATEGORY_PARAM, categoryRoute } from './manifest'

function Title({ children, note }: { children: ReactNode; note: string }) {
  return <header className="page-heading shell stack">
    <p className="u-label">{note}</p>
    <h1 id="route-title" tabIndex={-1} className="u-display">{children}</h1>
  </header>
}

function GarmentMovement({ garment, index = 0 }: { garment: Garment; index?: number }) {
  return <Movement ground={index % 2 === 0 ? 'paper' : 'ink'} className="story-movement" labelledBy={`garment-${garment.slug}`} spine={garment.kanji}>
    <div className="story-pair shell">
      <SumiLink to={`/collection/${garment.slug}`} className="plate-link" aria-label={`View ${garment.name}`}>
        <InkPlate slot={garment.slot} alt={garment.alt} />
      </SumiLink>
      <Rise className="story-copy stack">
        <p className="u-label">{garment.index} / {CATEGORY_LABELS[garment.category]}</p>
        <h2 className="u-headline" id={`garment-${garment.slug}`}>{garment.name}</h2>
        <p>{garment.summary}</p>
        <p className="u-small">{garment.composition}</p>
        <p>{formatPrice(garment.price)}</p>
        <SumiLink to={`/collection/${garment.slug}`} className="link-rule">Examine the garment</SumiLink>
      </Rise>
    </div>
  </Movement>
}

export function Home() {
  useDocumentTitle('SUMI. Cloth, ink, and air.')
  return <>
    <Movement ground="void" className="home-opening" labelledBy="route-title">
      <div className="home-opening__study" aria-hidden="true"><ClothStudy /></div>
      <div className="home-opening__copy shell stack">
        <p className="u-label">Collection 01 / Autumn and Winter</p>
        <h1 className="u-display" id="route-title" tabIndex={-1}>Cloth, ink,<br />and air.</h1>
        <p>Utsuroi. The imperceptible shifting of season and colour.</p>
        <a className="link-rule" href="#first-garment">Unroll the collection</a>
      </div>
      <span className="home-opening__kanji u-vertical" lang="ja" aria-hidden="true">移ろい</span>
    </Movement>
    <div id="first-garment"><GarmentMovement garment={garments[0]} /></div>
    <Movement className="story-movement" labelledBy="making-title" spine="縫う">
      <div className="story-pair shell">
        <InkPlate slot="atelier-sewing" alt={process[4].alt} />
        <Rise className="story-copy stack">
          <p className="u-label">The making / Sewing</p>
          <h2 id="making-title" className="u-headline">Every seam<br />can be seen.</h2>
          <p>{process[4].body}</p>
          <SumiLink className="link-rule" to="/atelier">Inside the atelier</SumiLink>
        </Rise>
      </div>
    </Movement>
    <Movement ground="paper" className="closing-movement shell stack" labelledBy="collection-title">
      <p className="u-label">Collection 01</p>
      <h2 className="u-headline" id="collection-title">Utsuroi</h2>
      <SumiLink className="link-rule" to="/collection">Read the whole collection</SumiLink>
    </Movement>
  </>
}

export function Collection() {
  useDocumentTitle('Utsuroi — Collection 01 / SUMI')
  const [params, setParams] = useSearchParams()
  const requested = params.get(CATEGORY_PARAM)
  const category = categoriesInUse.find((value) => value === requested)
  const shown = category ? garments.filter((garment) => garment.category === category) : garments
  function filter(value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      if (value) next.set(CATEGORY_PARAM, value)
      else next.delete(CATEGORY_PARAM)
      return next
    })
  }
  return <>
    <Movement ground="ink">
      <Title note="Collection 01 / Autumn and Winter">Utsuroi</Title>
      <div className="collection-filter shell">
        <div className="chips" role="group" aria-label="Filter garments">
          <button className="chip" type="button" aria-pressed={!category} onClick={() => filter('')}>All</button>
          {categoriesInUse.map((value) => <button className="chip" type="button" key={value} aria-pressed={category === value} onClick={() => filter(value)}>{CATEGORY_LABELS[value]}</button>)}
        </div>
        <p className="u-small" role="status">{shown.length} {shown.length === 1 ? 'garment' : 'garments'}</p>
      </div>
    </Movement>
    {shown.map((garment, index) => <GarmentMovement key={garment.slug} garment={garment} index={index} />)}
  </>
}

export function Product() {
  const { slug = '' } = useParams()
  const garment = garmentBySlug(slug)
  return garment ? <ProductDetail key={garment.slug} garment={garment} /> : <NotFound />
}

function ProductDetail({ garment }: { garment: Garment }) {
  useDocumentTitle(`${garment.name} / SUMI`)
  const { add } = useCart()
  const [size, setSize] = useState('')
  const [colourName, setColourName] = useState(garment.colourways[0].name)
  const colour = garment.colourways.find((entry) => entry.name === colourName)!
  function addToBag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!garment.sizes.includes(size)) return
    add({ slug: garment.slug, name: garment.name, size, colour: colour.name, price: garment.price, slot: garment.slot, alt: garment.alt })
  }
  return <>
    <Movement>
      <Title note={`Collection 01 / ${garment.index}`}>{garment.name}</Title>
      <div className="product-layout shell">
        <InkPlate slot={garment.slot} alt={garment.alt} priority static />
        <div className="story-copy stack">
          <p className="u-lede">{garment.summary}</p>
          <p>{formatPrice(garment.price)}</p>
          <form className="stack" onSubmit={addToBag}>
            <fieldset className="stack compact-stack"><legend>Colour — {colour.romaji}</legend>
              <div className="choices">{garment.colourways.map((option) => <label className="choice" key={option.name}>
                <input type="radio" name="colour" value={option.name} checked={option.name === colourName} onChange={() => setColourName(option.name)} />
                <span>{option.name}</span>
              </label>)}</div>
            </fieldset>
            <div className="stack compact-stack">
              <label htmlFor="garment-size">Size</label>
              <select id="garment-size" className="field__input" value={size} required onChange={(event) => setSize(event.target.value)}>
                <option value="" disabled>Select a size</option>
                {garment.sizes.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <a className="link-rule" href={`mailto:${APPOINTMENT_EMAIL}?subject=${encodeURIComponent(`Sizing — ${garment.name}`)}`}>Ask about measurements</a>
            </div>
            <button className="btn btn--primary" type="submit"><span className="btn__label">Add to bag</span></button>
          </form>
          <p className="u-small">The bag prepares an enquiry to the atelier. No payment is taken here.</p>
        </div>
      </div>
    </Movement>
    <Movement ground="paper" className="story-movement shell" labelledBy="construction-title">
      <div className="reading stack">
        <p className="u-label">Material and construction</p>
        <h2 className="u-headline" id="construction-title">The hand of the cloth.</h2>
        <dl>
          {([['Composition', garment.composition], ['Weight', garment.cloth.weight], ['Origin', garment.origin], ['Care', garment.care]] as const).map(([key, value]) => <div className="spec" key={key}><dt className="spec__key">{key}</dt><dd className="spec__value">{value}</dd></div>)}
        </dl>
        {garment.detail.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
    </Movement>
    <Movement ground="void" className="closing-movement shell stack" labelledBy="cloth-title">
      <h2 className="u-headline" id="cloth-title">Cloth study</h2>
      <p>{garment.composition} {garment.cloth.weight}.</p>
      <p className="u-small">A study of drape and light. Refer to the garment photograph for its cut.</p>
      <ClothStudy cloth={garment.cloth} tint={colour.hex} />
      <SumiLink className="link-rule" to={categoryRoute(garment.category)}>Return to {CATEGORY_LABELS[garment.category].toLowerCase()}</SumiLink>
    </Movement>
  </>
}

export function Atelier() {
  useDocumentTitle('Atelier / SUMI')
  return <>
    <Movement><Title note={`${house.city} / ${house.district} / Since ${house.founded}`}>The atelier</Title><p className="route-intro shell">{house.statement}</p></Movement>
    {process.map((step, index) => <Movement key={step.index} ground={index % 2 === 0 ? 'paper' : 'ink'} className="story-movement" labelledBy={`process-${step.index}`} spine={step.ja}>
      <div className="story-pair shell">
        <InkPlate slot={step.slot} alt={step.alt} />
        <Rise className="story-copy stack"><p className="u-label">{step.index} / {step.romaji}</p><h2 className="u-headline" id={`process-${step.index}`}>{step.title}</h2><p>{step.body}</p></Rise>
      </div>
    </Movement>)}
    <Movement className="closing-movement shell stack" labelledBy="visit-title"><h2 className="u-headline" id="visit-title">By appointment.</h2><p>{house.visit.line1}</p><p>{house.visit.line2}</p><a className="link-rule" href={`mailto:${APPOINTMENT_EMAIL}`}>Arrange a visit</a></Movement>
  </>
}

export function Journal() {
  useDocumentTitle('Journal / SUMI')
  return <>
    <Movement><Title note="Notes on material and method">Journal</Title></Movement>
    {journal.map((entry, index) => <Movement ground={index % 2 === 0 ? 'paper' : 'ink'} key={entry.slug} className="story-movement" labelledBy={`entry-${entry.slug}`}>
      <div className="story-pair shell">
        <SumiLink to={`/journal/${entry.slug}`} className="plate-link" aria-label={`Read ${entry.title}`}><InkPlate slot={entry.slot} alt={entry.alt} /></SumiLink>
        <div className="story-copy stack"><p className="u-label">{entry.field} / <time dateTime={entry.date}>{formatDate(entry.date)}</time></p><h2 id={`entry-${entry.slug}`} className="u-headline">{entry.title}</h2><p>{entry.standfirst}</p><SumiLink className="link-rule" to={`/journal/${entry.slug}`}>Read the note</SumiLink></div>
      </div>
    </Movement>)}
  </>
}

export function JournalArticle() {
  const { slug = '' } = useParams()
  const entry = entryBySlug(slug)
  useDocumentTitle(entry ? `${entry.title} / Journal / SUMI` : 'Not found / SUMI')
  if (!entry) return <NotFound />
  return <article>
    <Movement><Title note={`${entry.field} / ${formatDate(entry.date)}`}>{entry.title}</Title><p className="route-intro shell">{entry.standfirst}</p></Movement>
    <Movement ground="paper" className="story-movement shell">
      <div className="reading stack"><InkPlate slot={entry.slot} alt={entry.alt} priority />{entry.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<blockquote className="u-title">{entry.pullQuote.en}</blockquote><SumiLink className="link-rule" to="/journal">Return to the journal</SumiLink></div>
    </Movement>
  </article>
}

export function NotFound() {
  useDocumentTitle('Not found / SUMI')
  return <Movement className="not-found"><Title note="404">This page is absent.</Title><div className="shell"><SumiLink className="link-rule" to="/collection">Return to the collection</SumiLink></div></Movement>
}
