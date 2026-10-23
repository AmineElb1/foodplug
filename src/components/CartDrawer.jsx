import { useEffect, useRef, useState } from 'react'
import Qty from './Qty.jsx'
import { INFO } from '../info.js'
import { euro } from '../format.js'
import { getSlots, getAsap, describeSlot } from '../hoursCore.js'
import { normalizePhone } from '../phone.js'
import { useDialog } from '../useDialog.js'

const CONTACT_KEY = 'foodplug-contact'
export const PENDING_KEY = 'foodplug-pending'
const VERIFY_KEY = 'foodplug-verify'

const loadContact = () => {
  try { return JSON.parse(localStorage.getItem(CONTACT_KEY) || '{}') } catch { return {} }
}

export default function CartDrawer({ open, onClose, items, count, total, saved, setQty, clear, config }) {
  const closeBtn = useRef(null)
  const panel = useDialog(open, onClose, closeBtn)
  const [step, setStep] = useState('cart') // cart | checkout | done | send
  const [name, setName] = useState(() => loadContact().name || '')
  const [phone, setPhone] = useState(() => loadContact().phone || '')
  const [note, setNote] = useState('')
  const [method, setMethod] = useState(null) // null = standaard: online als het kan, anders cash
  const [days, setDays] = useState([])
  const [asap, setAsap] = useState(null)
  const [slot, setSlot] = useState('') // 'asap' of een tijdstip (ISO)
  const [slotNote, setSlotNote] = useState('')
  const [verify, setVerify] = useState(null) // null of { code, busy, error, cooldown }
  const slotRef = useRef('')
  const codeRef = useRef(null)
  const [trap, setTrap] = useState('') // verborgen veld tegen bots
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  slotRef.current = slot

  // Leeg mandje terwijl je afrekent (bv. in een ander tabblad): terug naar het mandje.
  useEffect(() => { if (count === 0 && step === 'checkout') setStep('cart') }, [count, step])

  // Elke 30 seconden de tijden bijwerken: wat verstrijkt verdwijnt uit de lijst.
  useEffect(() => {
    if (!open || step !== 'checkout') return
    const id = setInterval(() => loadSlots(slotRef.current), 30_000)
    return () => clearInterval(id)
  }, [open, step])

  const cooldown = verify?.cooldown ?? 0
  useEffect(() => {
    if (!verify || cooldown <= 0) return
    const id = setTimeout(() => setVerify((v) => (v ? { ...v, cooldown: v.cooldown - 1 } : v)), 1000)
    return () => clearTimeout(id)
  }, [verify, cooldown])
  useEffect(() => { if (verify && codeRef.current) codeRef.current.focus() }, [!!verify])

  if (!open) return null

  const payMethod = method ?? (config.online ? 'online' : 'cash')
  const phoneNorm = normalizePhone(phone)
  // Is de server nog niet klaar voor cash (geen WhatsApp-melding ingesteld), dan sturen we de klant met een
  // kant-en-klaar bericht naar WhatsApp. De bestelling is pas geplaatst als de klant dat bericht verstuurt.
  const viaLink = payMethod === 'cash' && !config.cash
  const needsCode = payMethod === 'cash' && config.cash && config.verify
  const close = () => { onClose(); if (step !== 'checkout') setStep('cart'); if (step === 'done') setResult(null) }

  // Beschikbare tijden opnieuw berekenen. Is de gekozen tijd intussen verstreken, dan kiezen we de
  // eerstvolgende en zeggen we dat erbij.
  function loadSlots(keep = '') {
    const now = new Date()
    const d = getSlots(now)
    const a = getAsap(now)
    const valid = keep === 'asap' ? !!a : d.some((x) => x.times.some((t) => t.iso === keep))
    setDays(d)
    setAsap(a)
    setSlot(valid ? keep : a ? 'asap' : d[0]?.times[0]?.iso ?? '')
    setSlotNote(keep && !valid ? 'Je gekozen afhaalmoment is verstreken. We hebben het eerstvolgende moment gekozen.' : '')
  }
  const goCheckout = () => { setError(''); setTried(false); setVerify(null); loadSlots(''); setStep('checkout') }

  const nameOk = name.trim().length >= 2
  const phoneOk = !!phoneNorm
  const valid = nameOk && phoneOk && !!slot

  const readToken = () => {
    try {
      const v = JSON.parse(localStorage.getItem(VERIFY_KEY) || 'null')
      return v && v.phone === phoneNorm && v.exp > Date.now() ? v.token : null
    } catch { return null }
  }

  async function post(url, body) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return { res, data: await res.json().catch(() => ({})) }
  }

  async function placeOrder(token) {
    setBusy(true)
    setError('')
    try {
      const { res, data } = await post('/api/orders', {
        name, phone, note, method: payMethod, slot, website: trap, verifyToken: token,
        items: items.map((l) => ({ id: l.id, choice: l.choice?.id ?? null, qty: l.qty })),
      })
      if (!res.ok) {
        if (res.status === 403 && data.code === 'verify') { // bewijs verlopen of ongeldig: opnieuw verifiëren
          try { localStorage.removeItem(VERIFY_KEY) } catch { /* idem */ }
          setBusy(false)
          return startVerify()
        }
        setError(data.error || 'Er ging iets mis. Probeer het opnieuw.')
        setVerify(null)
        if (res.status === 400) loadSlots(slot)
        setBusy(false)
        return
      }
      try { localStorage.setItem(CONTACT_KEY, JSON.stringify({ name: name.trim(), phone: phone.trim() })) } catch { /* privémodus */ }
      if (data.status === 'payment') {
        // Naar Mollie. Het mandje blijft staan tot de betaling gelukt is (zie OrderReturn).
        try { localStorage.setItem(PENDING_KEY, JSON.stringify({ ref: data.ref, pid: data.paymentId, slotLabel: data.slotLabel, totalCents: data.totalCents })) } catch { /* idem */ }
        window.location.assign(data.checkoutUrl)
        return
      }
      setVerify(null)
      setResult(data)
      clear()
      setStep('done')
    } catch {
      setError('Geen verbinding. Probeer het opnieuw of bel ons.')
    }
    setBusy(false)
  }

  async function startVerify() {
    setBusy(true)
    setError('')
    try {
      const { res, data } = await post('/api/verify-start', { phone })
      if (!res.ok) { setError(data.error || 'We konden de code niet versturen.'); setBusy(false); return }
      setVerify({ code: '', busy: false, error: '', cooldown: 30 })
    } catch {
      setError('Geen verbinding. Probeer het opnieuw of bel ons.')
    }
    setBusy(false)
  }

  const waLink = () => {
    const when = slot === 'asap' ? `zo snel mogelijk (rond ${asap?.label})` : describeSlot(slot)
    const text = [
      'Nieuwe bestelling via de website (afhalen)',
      '',
      `Naam: ${name.trim()}`,
      `Telefoon: ${phoneNorm}`,
      `Afhalen: ${when}`,
      '',
      ...items.map((i) => `${i.qty}x ${i.name}${i.choice ? ` (${i.choice.label})` : ''} (${euro(i.price * i.qty)})`),
      '',
      `Totaal: ${euro(total)}`,
      'Betaling: cash bij afhalen',
      note.trim() ? `Opmerking: ${note.trim()}` : null,
    ].filter((l) => l !== null).join('\n')
    return `https://wa.me/${INFO.whatsapp}?text=${encodeURIComponent(text)}`
  }

  const submit = async (e) => {
    e.preventDefault()
    setTried(true)
    if (!valid || busy) return
    if (viaLink) {
      try { localStorage.setItem(CONTACT_KEY, JSON.stringify({ name: name.trim(), phone: phone.trim() })) } catch { /* privémodus */ }
      setResult({ href: waLink(), slotLabel: slot === 'asap' ? `zo snel mogelijk (rond ${asap?.label})` : describeSlot(slot), totalCents: Math.round(total * 100) })
      setStep('send')
      return
    }
    if (needsCode) {
      const token = readToken()
      if (!token) return startVerify()
      return placeOrder(token)
    }
    return placeOrder(null)
  }

  const confirmCode = async (e) => {
    e.preventDefault()
    if (!verify || verify.busy) return
    if (!/^\d{6}$/.test(verify.code.trim())) { setVerify({ ...verify, error: 'Vul de code van 6 cijfers in.' }); return }
    setVerify({ ...verify, busy: true, error: '' })
    try {
      const { res, data } = await post('/api/verify-check', { phone, code: verify.code })
      if (!res.ok) { setVerify((v) => ({ ...v, busy: false, error: data.error || 'Deze code klopt niet.' })); return }
      try { localStorage.setItem(VERIFY_KEY, JSON.stringify({ phone: data.phone, token: data.token, exp: data.exp })) } catch { /* idem */ }
      await placeOrder(data.token)
    } catch {
      setVerify((v) => (v ? { ...v, busy: false, error: 'Geen verbinding. Probeer het opnieuw.' } : v))
    }
  }

  const title = step === 'checkout' ? 'Afrekenen' : step === 'done' ? 'Bedankt!' : step === 'send' ? 'Bijna klaar' : 'Jouw mandje'

  return (
    <div className="drawer">
      <div className="drawer__scrim" onClick={close} />
      <div className="drawer__panel" role="dialog" aria-modal="true" aria-labelledby="cart-title" ref={panel}>
        <div className="drawer__head">
          {step === 'checkout' && <button className="drawer__back" onClick={() => setStep('cart')} aria-label="Terug naar mandje">←</button>}
          <h2 id="cart-title" className="drawer__title">{title}</h2>
          <button ref={closeBtn} className="drawer__close" onClick={close} aria-label="Sluiten">×</button>
        </div>

        {step === 'send' && result && (
          <div className="done">
            <h3>Verstuur je bestelling</h3>
            <p>Je bestelling is <strong>pas geplaatst</strong> als je het bericht in WhatsApp verstuurt. Klik op de knop: het bericht staat al klaar, je hoeft alleen op verzenden te drukken.</p>
            <dl className="done__facts">
              <div><dt>Afhalen</dt><dd>{result.slotLabel}</dd></div>
              <div><dt>Totaal</dt><dd>{euro(result.totalCents / 100)}</dd></div>
              <div><dt>Betalen</dt><dd>Cash bij het afhalen</dd></div>
              <div><dt>Adres</dt><dd>{INFO.street}, {INFO.city}</dd></div>
            </dl>
            <a className="cartbar__btn sendlink" href={result.href} target="_blank" rel="noopener noreferrer" onClick={clear}>
              <span>Open WhatsApp en verstuur</span>
            </a>
            <button type="button" className="linkbtn" onClick={() => setStep('checkout')}>← Nog iets aanpassen</button>
          </div>
        )}

        {step === 'done' && result && (
          <div className="done">
            <div className="done__check" aria-hidden="true">✓</div>
            <h3>Bestelling geplaatst</h3>
            <p className="done__ref">{result.ref}</p>
            <dl className="done__facts">
              <div><dt>Afhalen</dt><dd>{result.slotLabel}</dd></div>
              <div><dt>Totaal</dt><dd>{euro(result.totalCents / 100)}</dd></div>
              <div><dt>Betalen</dt><dd>Cash bij het afhalen</dd></div>
              <div><dt>Adres</dt><dd>{INFO.street}, {INFO.city}</dd></div>
            </dl>
            <p className="done__hint">Wij hebben je bestelling ontvangen. Noem je naam of nummer {result.ref} bij het afhalen.</p>
            <button className="cartbar__btn" onClick={close}><span>Sluiten</span></button>
          </div>
        )}

        {step === 'cart' && (count === 0 ? (
          <div className="drawer__empty">
            <p>Je mandje is nog leeg.</p>
            <a href="#menu" className="btn btn--red" onClick={close}><span>Naar het menu</span></a>
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

              <div className="infobox">
                <strong>Afhalen bij Foodplug</strong>
                <span>{INFO.street}, {INFO.city}</span>
              </div>
              <p className="delivery-note">
                Liever laten bezorgen? Bestel via{' '}
                <a href={INFO.ubereats} target="_blank" rel="noopener noreferrer">Uber Eats</a> of{' '}
                {INFO.deliveroo ? <a href={INFO.deliveroo} target="_blank" rel="noopener noreferrer">Deliveroo</a> : 'Deliveroo'}.
              </p>
            </div>

            <div className="drawer__foot">
              {saved > 0 && <div className="saved">Je bespaart {euro(saved)}</div>}
              <div className="sum"><span>Totaal</span><strong>{euro(total)}</strong></div>
              <button className="cartbar__btn" onClick={goCheckout} disabled={!config.loaded}>
                <span>Verder naar afrekenen</span>
                <span>{euro(total)}</span>
              </button>
            </div>
          </>
        ))}

        {step === 'checkout' && verify && (
          <form className="checkout" onSubmit={confirmCode} noValidate>
            <div className="drawer__body">
              <h3 className="verify__title">Bevestig je nummer</h3>
              <p className="verify__text">We hebben een code via WhatsApp gestuurd naar <strong>{phoneNorm}</strong>. Vul die hier in om je bestelling te plaatsen.</p>
              <label className="field">
                <span>Code</span>
                <input ref={codeRef} className="codeinput" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000"
                  value={verify.code} onChange={(e) => setVerify({ ...verify, code: e.target.value.replace(/\D/g, ''), error: '' })} aria-invalid={!!verify.error} />
                {verify.error && <em role="alert">{verify.error}</em>}
              </label>
              <div className="verify__actions">
                <button type="button" className="linkbtn" disabled={cooldown > 0 || busy || verify.busy} onClick={startVerify}>
                  {cooldown > 0 ? `Code opnieuw sturen (${cooldown}s)` : 'Code opnieuw sturen'}
                </button>
                <button type="button" className="linkbtn" onClick={() => setVerify(null)}>Ander nummer</button>
              </div>
              <p className="drawer__hint">Geen code ontvangen? Controleer of dit nummer WhatsApp heeft, of kies online betalen.</p>
            </div>
            <div className="drawer__foot">
              {error && <div className="notice notice--err" role="alert">{error}</div>}
              <div className="sum"><span>Totaal</span><strong>{euro(total)}</strong></div>
              <button className="cartbar__btn" type="submit" disabled={verify.busy || busy}>
                <span>{verify.busy || busy ? 'Even geduld…' : 'Bevestigen en bestellen'}</span>
                <span>{euro(total)}</span>
              </button>
            </div>
          </form>
        )}

        {step === 'checkout' && !verify && (
          <form className="checkout" onSubmit={submit} noValidate>
            <div className="drawer__body">
              <p className="checkout__sum">{count} {count === 1 ? 'gerecht' : 'gerechten'} · <strong>{euro(total)}</strong> · afhalen aan {INFO.street}</p>

              <label className="field">
                <span>Naam</span>
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={tried && !nameOk} />
                {tried && !nameOk && <em>Vul je naam in.</em>}
              </label>
              <label className="field">
                <span>Telefoonnummer</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="04.. .. .. .." aria-invalid={tried && !phoneOk} />
                {tried && !phoneOk && <em>Vul een geldig telefoonnummer in.</em>}
              </label>

              <label className="field">
                <span>Afhaalmoment</span>
                <select value={slot} onChange={(e) => { setSlot(e.target.value); setSlotNote('') }} aria-describedby="slot-hint">
                  {asap && <option value="asap">Zo snel mogelijk (rond {asap.label})</option>}
                  {days.map((d) => (
                    <optgroup key={d.key} label={d.label}>
                      {d.times.map((t) => <option key={t.iso} value={t.iso}>{t.label}{t.afterMidnight ? ' (na middernacht)' : ''}</option>)}
                    </optgroup>
                  ))}
                </select>
                <small id="slot-hint" className={slotNote ? 'field__note' : ''} role={slotNote ? 'status' : undefined}>
                  {slotNote || (asap ? 'Je bestelling is klaar na ongeveer 20 minuten.' : 'We zijn nu gesloten: kies wanneer je komt afhalen.')}
                </small>
              </label>

              <fieldset className="opts pay">
                <legend>Hoe wil je betalen?</legend>
                <label className={`${payMethod === 'online' ? 'is-on' : ''} ${config.online ? '' : 'is-disabled'}`}>
                  <input type="radio" name="pay" checked={payMethod === 'online'} disabled={!config.online} onChange={() => setMethod('online')} />
                  <span className="opts__dot" aria-hidden="true" />
                  <span className="pay__text">Online betalen<small>{config.online ? 'Bancontact, kaart of Apple Pay' : 'Binnenkort beschikbaar'}</small></span>
                </label>
                <label className={payMethod === 'cash' ? 'is-on' : ''}>
                  <input type="radio" name="pay" checked={payMethod === 'cash'} onChange={() => setMethod('cash')} />
                  <span className="opts__dot" aria-hidden="true" />
                  <span className="pay__text">Cash bij afhalen<small>Je betaalt als je je bestelling ophaalt</small></span>
                </label>
              </fieldset>

              <label className="field">
                <span>Opmerking (optioneel)</span>
                <textarea rows={2} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Allergieën, zonder ui, ..." />
              </label>
              <div className="hp" aria-hidden="true">
                <label>Website<input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} /></label>
              </div>
            </div>

            <div className="drawer__foot">
              {error && <div className="notice notice--err" role="alert">{error}</div>}
              <div className="sum"><span>Totaal</span><strong>{euro(total)}</strong></div>
              <button className="cartbar__btn" type="submit" disabled={busy}>
                <span>{busy ? 'Even geduld…' : payMethod === 'online' ? 'Betalen' : viaLink ? 'Bestel via WhatsApp' : 'Bestelling plaatsen'}</span>
                <span>{euro(total)}</span>
              </button>
              <p className="drawer__hint">
                {payMethod === 'online'
                  ? 'Je gaat naar een beveiligde betaalpagina van Mollie.'
                  : viaLink
                    ? 'Je bestelling opent als bericht in WhatsApp. Je betaalt cash bij het afhalen.'
                  : needsCode && !readToken()
                    ? 'We sturen je eerst een code via WhatsApp om je nummer te bevestigen. Je betaalt cash bij het afhalen.'
                    : 'Je betaalt cash wanneer je de bestelling ophaalt.'}
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
