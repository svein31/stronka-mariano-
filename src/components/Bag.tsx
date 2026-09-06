import { useEffect, useRef } from 'react'
import { useCart } from '../state/cart'
import { useCapabilities } from '../lib/capabilities'
import { useFocusTrap } from '../lib/focus'
import { formatPrice } from '../data/collection'
import { APPOINTMENT_EMAIL } from '../routes/manifest'

export function Bag() {
  const { lines, total, open, setOpen, remove, setQuantity } = useCart()
  const { scroll } = useCapabilities()
  const surface = useRef<HTMLDivElement>(null)
  useFocusTrap(surface, open, { onEscape: () => setOpen(false) })

  useEffect(() => {
    if (!open) return
    const content = document.getElementById('site-content')
    const wasInert = content?.inert ?? false
    if (content) content.inert = true
    scroll.stop()
    return () => {
      if (content) content.inert = wasInert
      scroll.start()
    }
  }, [open, scroll])

  const enquiry = lines.map((line) => `${line.name} / Size ${line.size} / ${line.colour} / Quantity ${line.quantity}`).join('\n')
  return <>
    <div className="drawer__scrim" data-open={open} aria-hidden="true" onClick={() => setOpen(false)} />
    <div ref={surface} className="drawer" data-open={open} role="dialog" aria-modal={open || undefined} aria-labelledby="bag-title" inert={!open} tabIndex={-1} data-lenis-prevent>
      <div className="drawer__head"><h2 className="u-title" id="bag-title">Your bag</h2><button className="drawer__close" type="button" onClick={() => setOpen(false)} aria-label="Close bag" /></div>
      <div className="drawer__body">
        {lines.length === 0 ? <p className="drawer-empty" role="status">Your bag is empty.</p> : <ul className="bag-lines">
          {lines.map((line) => <li className="bag-line stack" key={line.key}>
            <h3 className="u-title">{line.name}</h3><p>Size {line.size} / {line.colour}</p>
            <label className="bag-quantity">Quantity for {line.name}<select value={line.quantity} onChange={(event) => setQuantity(line.key, Number(event.target.value))}>
              {Array.from({ length: Math.max(10, line.quantity) }, (_, index) => index + 1).map((quantity) => <option key={quantity}>{quantity}</option>)}
            </select></label>
            <p>{formatPrice(line.price * line.quantity)}</p>
            <button className="link-rule" type="button" onClick={() => remove(line.key)} aria-label={`Remove ${line.name}, size ${line.size}, ${line.colour}`}>Remove</button>
          </li>)}
        </ul>}
      </div>
      {lines.length > 0 && <div className="bag-summary stack">
        <p role="status">Subtotal {formatPrice(total)}</p>
        <p className="u-small">Availability, delivery and payment are confirmed by the atelier.</p>
        <a className="btn btn--primary" href={`mailto:${APPOINTMENT_EMAIL}?subject=${encodeURIComponent('Collection 01 enquiry')}&body=${encodeURIComponent(enquiry)}`}><span className="btn__label">Enquire with the atelier</span></a>
      </div>}
    </div>
  </>
}
