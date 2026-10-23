import { productById } from '../../src/data.js'
import { isValidSlot, describeSlot, getAsap, timeOf } from '../../src/hoursCore.js'
import { normalizePhone } from '../../src/phone.js'

export { normalizePhone }

export const MAX_TOTAL_CENTS = 25000 // een bestelling boven € 250 komt niet via de site binnen
const MAX_LINES = 30
const REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const euro = (cents) => `€ ${(cents / 100).toFixed(2).replace('.', ',')}`
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)

export function newRef() {
  let s = ''
  for (let i = 0; i < 4; i++) s += REF_CHARS[Math.floor(Math.random() * REF_CHARS.length)]
  return `FP-${s}`
}

// Bouwt een bestelling uit de invoer van de klant. Prijzen komen altijd uit de eigen menudata,
// nooit uit de browser.
export function buildOrder(input, now = new Date()) {
  const err = (error) => ({ error })
  if (!input || typeof input !== 'object') return err('Ongeldige bestelling.')
  if (input.website) return err('Ongeldige bestelling.') // verborgen veld: alleen bots vullen dat in

  const name = clean(input.name, 60)
  if (name.length < 2) return err('Vul je naam in.')
  const phone = normalizePhone(input.phone)
  if (!phone) return err('Vul een geldig telefoonnummer in.')
  const method = input.method
  if (method !== 'online' && method !== 'cash') return err('Kies hoe je wilt betalen.')
  let slotIso, asap = false
  if (input.slot === 'asap') {
    const a = getAsap(now)
    if (!a) return err('Zo snel mogelijk is nu niet beschikbaar. Kies een afhaalmoment.')
    slotIso = a.iso
    asap = true
  } else {
    if (!isValidSlot(input.slot, now)) return err('Dit afhaalmoment is niet meer beschikbaar. Kies een ander moment.')
    slotIso = new Date(input.slot).toISOString()
  }

  if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > MAX_LINES) return err('Je mandje is leeg.')
  const lines = []
  let totalCents = 0
  for (const it of input.items) {
    const p = productById[it?.id]
    const qty = Number(it?.qty)
    if (!p) return err('Een gerecht in je mandje bestaat niet meer. Vernieuw de pagina.')
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) return err('Kies per gerecht tussen 1 en 20 stuks.')
    let choice = null
    if (p.options) {
      choice = p.options.choices.find((c) => c.id === it.choice)
      if (!choice) return err(`Kies een optie voor ${p.name}.`)
    } else if (it.choice) return err('Ongeldige bestelling.')
    const priceCents = Math.round(p.price * 100)
    totalCents += priceCents * qty
    lines.push({ id: p.id, name: p.name, choiceId: choice?.id ?? null, choiceLabel: choice?.label ?? null, qty, priceCents })
  }
  if (totalCents > MAX_TOTAL_CENTS) return err('Deze bestelling is te groot voor de website. Bel ons even.')

  return {
    order: {
      ref: newRef(), name, phone, method, slotIso, asap, slotLabel: slotText(slotIso, asap, now),
      note: clean(input.note, 200), lines, totalCents,
    },
  }
}

// Compacte versie voor in de metadata van de Mollie-betaling (limiet ± 1 kB).
// "zo snel mogelijk (rond 18:30)" of "vandaag 19:15"
export const slotText = (iso, asap, now) => (asap ? `zo snel mogelijk (rond ${timeOf(iso)})` : describeSlot(iso, now))

export function encodeMeta(o) {
  return {
    ref: o.ref, name: o.name, phone: o.phone, slot: o.slotIso, asap: o.asap ? 1 : 0, note: o.note,
    items: o.lines.map((l) => `${l.id}~${l.choiceId || ''}~${l.qty}`),
  }
}

export function decodeMeta(meta, now = new Date()) {
  if (!meta?.ref || !Array.isArray(meta.items)) return null
  const lines = []
  for (const s of meta.items) {
    const [id, choiceId, qty] = String(s).split('~')
    const p = productById[id]
    if (!p) return null
    const choice = p.options?.choices.find((c) => c.id === choiceId) ?? null
    lines.push({ id, name: p.name, choiceId: choice?.id ?? null, choiceLabel: choice?.label ?? null, qty: Number(qty), priceCents: Math.round(p.price * 100) })
  }
  const totalCents = lines.reduce((s, l) => s + l.priceCents * l.qty, 0)
  return {
    ref: meta.ref, name: meta.name, phone: meta.phone, method: 'online', slotIso: meta.slot,
    asap: !!meta.asap, slotLabel: slotText(meta.slot, !!meta.asap, now), note: meta.note || '', lines, totalCents,
  }
}

export const lineText = (l) => `${l.qty}x ${l.name}${l.choiceLabel ? ` (${l.choiceLabel})` : ''}`
