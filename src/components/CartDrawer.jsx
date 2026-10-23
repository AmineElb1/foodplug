import { useRef, useState } from 'react'
import Qty from './Qty.jsx'
import { INFO } from '../info.js'
import { euro } from '../format.js'
import { useOpenStatus } from '../hours.js'
import { useDialog } from '../useDialog.js'

export default function CartDrawer({ open, onClose, items, count, total, saved, setQty, clear }) {
  const status = useOpenStatus()
  const closeBtn = useRef(null)
  const [mode, setMode] = useState('afhalen')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [tried, setTried] = useState(false)

  const panel = useDialog(open, onClose, closeBtn)

  if (!open) return null

  const nameOk = name.trim().length > 0
  const addressOk = mode === 'afhalen' || address.trim().length > 0
  const valid = count > 0 && nameOk && addressOk

  const message = [
    'Nieuwe bestelling via de website',
    '',
    `Naam: ${name.trim()}`,
    mode === 'bezorgen' ? `Bezorgen: ${address.trim()}` : 'Afhalen',
    '',
    ...items.map((i) => `${i.qty}x ${i.name}${i.choice ? ` (${i.choice.label})` : ''} (${euro(i.price * i.qty)})`),
    '',
    `Totaal: ${euro(total)}`,
    note.trim() ? `Opmerking: ${note.trim()}` : false,
  ].filter((l) => l !== false).join('\n')
  const href = `https://wa.me/${INFO.whatsapp}?text=${encodeURIComponent(message)}`

  return (
    <div className="drawer">
      <div className="drawer__scrim" onClick={onClose} />
      <div className="drawer__panel" role="dialog" aria-modal="true" aria-labelledby="cart-title" ref={panel}>
        <div className="drawer__head">
          <h2 id="cart-title" className="drawer__title">Jouw mandje</h2>
          <button ref={closeBtn} className="drawer__close" onClick={onClose} aria-label="Mandje sluiten">×</button>
        </div>

        {count === 0 ? (
          <div className="drawer__empty">
            <p>Je mandje is nog leeg.</p>
            <a href="#menu" className="btn btn--red" onClick={onClose}><span>Naar het menu</span></a>
          </div>
        ) : (
          <>
            <div className="drawer__body">
              <ul className="lines">
                {items.map((i) => (
                  <li key={i.key} className="line">
                    <div className="line__main">
                      <div className="line__name">{i.name}</div>
                      {i.choice && <div className="line__choice">{i.choice.label}</div>}
                      <div className="line__unit">{euro(i.price)}{i.oldPrice && <s>{euro(i.oldPrice)}</s>}</div>
                    </div>
                    <Qty qty={i.qty} onChange={(q) => setQty(i.key, q)} label={i.choice ? `${i.name} (${i.choice.label})` : i.name} />
                    <div className="line__total">{euro(i.price * i.qty)}</div>
                  </li>
                ))}
              </ul>
              <button type="button" className="linkbtn" onClick={clear}>Mandje leegmaken</button>

              <fieldset className="mode">
                <legend>Hoe wil je je bestelling ontvangen?</legend>
                {['afhalen', 'bezorgen'].map((m) => (
                  <label key={m} className={mode === m ? 'is-on' : ''}>
                    <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} />
                    <span>{m === 'afhalen' ? 'Afhalen' : 'Bezorgen'}</span>
                  </label>
                ))}
              </fieldset>

              <label className="field">
                <span>Naam</span>
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={tried && !nameOk} />
                {tried && !nameOk && <em>Vul je naam in.</em>}
              </label>
              {mode === 'bezorgen' && (
                <label className="field">
                  <span>Bezorgadres</span>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" aria-invalid={tried && !addressOk} />
                  {tried && !addressOk && <em>Vul je adres in.</em>}
                </label>
              )}
              <label className="field">
                <span>Opmerking (optioneel)</span>
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Allergieën, kies je gratis drank, ..." />
              </label>
            </div>

            <div className="drawer__foot">
              {saved > 0 && <div className="saved">Je bespaart {euro(saved)}</div>}
              <div className="sum"><span>Totaal</span><strong>{euro(total)}</strong></div>
              <a
                className="cartbar__btn checkout"
                href={valid ? href : undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!valid}
                onClick={(e) => { if (!valid) { e.preventDefault(); setTried(true) } }}
              >
                <span>Bestel via WhatsApp</span>
                <span>{euro(total)}</span>
              </a>
              {!status.open && <p className="drawer__closed">{status.label}. Je kunt nu al bestellen; we antwoorden zodra we open zijn.</p>}
              <p className="drawer__hint">Je bestelling wordt als WhatsApp-bericht naar Foodplug gestuurd.</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
