import { useEffect, useRef, useState } from 'react'
import { INFO } from '../info.js'
import { euro } from '../format.js'
import { useDialog } from '../useDialog.js'
import { PENDING_KEY } from './CartDrawer.jsx'

const FINAL_BAD = ['failed', 'canceled', 'expired']
const POLL_MS = 2000
const POLL_TRIES = 15

// Venster dat opent als Mollie de klant terugstuurt naar /?order=FP-XXXX.
// De betaalstatus wordt bij Mollie nagevraagd (via onze server), nooit uit de URL afgeleid.
export default function OrderReturn({ refCode, onClose, onPaid }) {
  const closeBtn = useRef(null)
  const panel = useDialog(true, onClose, closeBtn)
  const [view, setView] = useState({ phase: 'checking' }) // checking | paid | failed | waiting | unknown

  useEffect(() => {
    let pending = null
    try { pending = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null') } catch { /* leeg */ }
    if (!pending || pending.ref !== refCode) { setView({ phase: 'unknown' }); return }

    let stop = false
    let tries = 0
    const poll = async () => {
      if (stop) return
      tries++
      try {
        const res = await fetch(`/api/order-status?pid=${encodeURIComponent(pending.pid)}`)
        const data = await res.json()
        if (data.status === 'paid') {
          localStorage.removeItem(PENDING_KEY)
          onPaid()
          setView({ phase: 'paid', slotLabel: data.slotLabel || pending.slotLabel, total: data.total })
          return
        }
        if (FINAL_BAD.includes(data.status)) { localStorage.removeItem(PENDING_KEY); setView({ phase: 'failed' }); return }
      } catch { /* even geen verbinding: opnieuw proberen */ }
      if (tries >= POLL_TRIES) { setView({ phase: 'waiting' }); return }
      setTimeout(poll, POLL_MS)
    }
    poll()
    return () => { stop = true }
  }, [refCode, onPaid])

  const { phase } = view
  return (
    <div className="drawer">
      <div className="drawer__scrim" onClick={onClose} />
      <div className="drawer__panel" role="dialog" aria-modal="true" aria-labelledby="return-title" ref={panel}>
        <div className="drawer__head">
          <h2 id="return-title" className="drawer__title">{phase === 'paid' ? 'Bedankt!' : phase === 'failed' ? 'Betaling niet gelukt' : 'Je bestelling'}</h2>
          <button ref={closeBtn} className="drawer__close" onClick={onClose} aria-label="Sluiten">×</button>
        </div>
        <div className="done">
          {phase === 'checking' && <p role="status">We controleren je betaling…</p>}

          {phase === 'paid' && (
            <>
              <div className="done__check" aria-hidden="true">✓</div>
              <h3>Betaald en ontvangen</h3>
              <p className="done__ref">{refCode}</p>
              <dl className="done__facts">
                {view.slotLabel && <div><dt>Afhalen</dt><dd>{view.slotLabel}</dd></div>}
                {view.total && <div><dt>Betaald</dt><dd>{euro(Number(view.total))}</dd></div>}
                <div><dt>Adres</dt><dd>{INFO.street}, {INFO.city}</dd></div>
              </dl>
              <p className="done__hint">Noem je naam of nummer {refCode} bij het afhalen.</p>
            </>
          )}

          {phase === 'failed' && (
            <>
              <p>Je betaling is niet gelukt of geannuleerd. Er is niets afgeschreven en je mandje staat nog klaar.</p>
              <button className="cartbar__btn" onClick={onClose}><span>Terug naar mijn mandje</span></button>
            </>
          )}

          {phase === 'waiting' && (
            <>
              <p>We wachten nog op de bevestiging van je betaling. Dat kan even duren. Heb je betaald, dan ontvangen wij je bestelling automatisch. Twijfel je? Bel ons met nummer {refCode}.</p>
              <a className="btn btn--red" href={INFO.phoneHref}><span>{INFO.phone}</span></a>
            </>
          )}

          {phase === 'unknown' && (
            <>
              <p>We konden de gegevens van deze bestelling niet terugvinden op dit toestel. Heb je betaald, dan hebben wij je bestelling ontvangen. Twijfel je? Bel ons met nummer {refCode}.</p>
              <a className="btn btn--red" href={INFO.phoneHref}><span>{INFO.phone}</span></a>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
