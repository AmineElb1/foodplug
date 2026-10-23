import { useRef, useState } from 'react'
import Qty from './Qty.jsx'
import { euro } from '../format.js'
import { useDialog } from '../useDialog.js'

// Detailweergave: foto, volledige omschrijving, verplichte keuzes en aantal.
export default function ProductSheet({ product: p, onClose, onAdd }) {
  const closeBtn = useRef(null)
  const panel = useDialog(true, onClose, closeBtn)
  const [choice, setChoice] = useState(null)
  const [qty, setQty] = useState(1)
  const [tried, setTried] = useState(false)

  const missing = p.options && !choice
  const submit = () => {
    if (missing) {
      setTried(true)
      panel.current?.querySelector('.opts input')?.focus()
      return
    }
    onAdd(p, choice, qty)
  }

  return (
    <div className="sheet">
      <div className="sheet__scrim" onClick={onClose} />
      <div className={`sheet__panel ${p.image ? '' : 'sheet__panel--noimg'}`} role="dialog" aria-modal="true" aria-labelledby="sheet-title" ref={panel}>
        <button ref={closeBtn} className="drawer__close sheet__close" onClick={onClose} aria-label="Sluiten">×</button>
        {p.image && <img className="sheet__img" src={p.image} alt={p.name} />}

        <div className="sheet__body">
          {p.badge && <span className="pcard__badge pcard__badge--static">{p.badge}</span>}
          <h2 id="sheet-title" className="sheet__title">{p.name}</h2>
          <div className="sheet__price">
            {euro(p.price)}{p.meta && <span className="sheet__meta">{p.meta}</span>}
          </div>
          {p.desc && <p className="sheet__desc">{p.desc}</p>}

          {p.options && (
            <fieldset className="opts">
              <legend>{p.options.label} <span className="opts__req">{p.options.hint ? `${p.options.hint} · verplicht` : 'Verplicht'}</span></legend>
              {tried && missing && <em className="opts__err" role="alert">Kies een optie om verder te gaan.</em>}
              {p.options.choices.map((c) => (
                <label key={c.id} className={choice?.id === c.id ? 'is-on' : ''}>
                  <input type="radio" name="option" checked={choice?.id === c.id} onChange={() => setChoice(c)} />
                  <span className="opts__dot" aria-hidden="true" />
                  <span>{c.label}</span>
                </label>
              ))}
            </fieldset>
          )}
        </div>

        <div className="sheet__foot">
          <Qty qty={qty} onChange={(q) => setQty(Math.max(1, Math.min(99, q)))} label={p.name} />
          <button type="button" className="cartbar__btn sheet__add" onClick={submit}>
            <span>{missing ? p.options.label : 'Toevoegen'}</span>
            <span>{euro(p.price * qty)}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
