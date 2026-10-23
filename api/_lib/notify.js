import { euro, lineText } from './order.js'

const PROVIDERS = ['console', 'meta', 'twilio']

// Zonder WHATSAPP_PROVIDER blijft bestellen op productie uit, zodat er nooit bestellingen
// "slagen" zonder dat iemand ze te zien krijgt. Lokaal valt het terug op loggen in de terminal.
export function provider() {
  return process.env.WHATSAPP_PROVIDER || (process.env.VERCEL ? '' : 'console')
}

// Nummer van de zaak dat elke bestelling ontvangt (OWNER_WHATSAPP; META_WA_TO werkt nog als oude naam).
export const ownerNumber = () => process.env.OWNER_WHATSAPP || process.env.META_WA_TO || ''
const e164 = (n) => `+${String(n).replace(/\D/g, '')}`

export function notificationsReady() {
  const p = provider()
  if (!PROVIDERS.includes(p)) return false
  const e = process.env
  if (p === 'meta') return !!(e.META_WA_TOKEN && e.META_WA_PHONE_ID && ownerNumber())
  if (p === 'twilio') return !!(e.TWILIO_ACCOUNT_SID && e.TWILIO_AUTH_TOKEN && ownerNumber())
  return true
}

// Sjabloon (standaard, werkt altijd) of vrije tekst. Vrije tekst werkt bij Meta alleen binnen 24 uur nadat
// de ontvanger het zakelijke nummer zelf een bericht stuurde: handig om te testen zonder goedgekeurd sjabloon.
const textMode = () => process.env.META_WA_MODE === 'text'

const payText = (o, paid) => (o.method === 'cash' ? 'CASH bij afhalen, nog te betalen' : paid ? 'Online betaald' : 'Online, betaling nog niet bevestigd')

export function plainMessage(o, { paid = false } = {}) {
  return [
    `Nieuwe bestelling ${o.ref}`,
    `Afhalen: ${o.slotLabel}`,
    `Klant: ${o.name} (${o.phone})`,
    '',
    ...o.lines.map(lineText),
    '',
    `Totaal: ${euro(o.totalCents)}`,
    `Betaling: ${payText(o, paid)}`,
    o.note ? `Opmerking: ${o.note}` : null,
  ].filter((l) => l !== null).join('\n')
}

// WhatsApp-sjabloonparameters mogen geen regeleinden of lange rijen spaties bevatten.
const param = (s) => String(s).replace(/[\r\n\t]+/g, ' ').replace(/ {5,}/g, '    ').trim().slice(0, 900) || '-'

async function metaSend(to, message) {
  const e = process.env
  const res = await fetch(`https://graph.facebook.com/${e.META_WA_VERSION || 'v21.0'}/${e.META_WA_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${e.META_WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: String(to).replace(/\D/g, ''), ...message }),
  })
  if (!res.ok) throw new Error(`Meta WhatsApp ${res.status}: ${(await res.text()).slice(0, 300)}`)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Twilio (WhatsApp-sandbox om te testen): gewone tekst naar een nummer dat de sandbox heeft "gejoind".
// Twilio zegt "queued" ook als de levering daarna mislukt (bv. nummer niet gejoind of 24-uursvenster
// verlopen), dus kijken we kort of het bericht echt onderweg is.
// Op een Twilio-proefaccount mag je geen eigen tekst sturen, alleen een sjabloon (ContentSid) van Twilio.
// Welke waarde op welke plek komt, staat in TWILIO_*_VARS, bv. '{"1":"{ref}","2":"{slot}"}'.
const fill = (tpl, ctx) => {
  let vars
  try { vars = JSON.parse(tpl || '{}') } catch { throw new Error('TWILIO_*_VARS is geen geldige JSON') }
  return JSON.stringify(Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, param(String(v).replace(/\{(\w+)\}/g, (_, n) => ctx[n] ?? ''))])))
}

async function twilioSend(to, text, template) {
  const e = process.env
  const base = `https://api.twilio.com/2010-04-01/Accounts/${e.TWILIO_ACCOUNT_SID}/Messages`
  const headers = { Authorization: `Basic ${Buffer.from(`${e.TWILIO_ACCOUNT_SID}:${e.TWILIO_AUTH_TOKEN}`).toString('base64')}` }
  const from = e164(e.TWILIO_WHATSAPP_FROM || '+14155238886')
  const res = await fetch(`${base}.json`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      To: `whatsapp:${e164(to)}`, From: `whatsapp:${from}`,
      ...(template ? { ContentSid: template.sid, ContentVariables: template.vars } : { Body: text }),
    }),
  })
  const sent = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${sent.message || ''} (code ${sent.code ?? '?'})`)
  for (let i = 0; i < 3; i++) {
    await sleep(i === 0 ? 700 : 1200)
    const s = await (await fetch(`${base}/${sent.sid}.json`, { headers })).json().catch(() => ({}))
    if (s.status === 'failed' || s.status === 'undelivered') {
      throw new Error(`Twilio ${s.status}: code ${s.error_code ?? '?'} ${s.error_message || ''}`.trim())
    }
    if (['sent', 'delivered', 'read'].includes(s.status)) return
  }
}

// Melding naar de eigenaar. Gooit een fout als het versturen mislukt.
export async function notifyOwner(order, { paid = false } = {}) {
  const p = provider()
  if (p === 'console') { console.log(`\n--- WhatsApp (testmodus) ---\n${plainMessage(order, { paid })}\n----------------------------\n`); return }
  if (p === 'twilio') {
    const sid = process.env.TWILIO_ORDER_CONTENT_SID
    const ctx = {
      ref: order.ref, slot: order.slotLabel, customer: `${order.name} (${order.phone})`, name: order.name,
      items: order.lines.map(lineText).join(' | '), total: euro(order.totalCents), pay: payText(order, paid), note: order.note || '-',
    }
    return twilioSend(ownerNumber(), plainMessage(order, { paid }), sid ? { sid, vars: fill(process.env.TWILIO_ORDER_VARS, ctx) } : undefined)
  }
  if (p !== 'meta') throw new Error('Geen WhatsApp-provider ingesteld')
  const e = process.env
  if (textMode()) return metaSend(ownerNumber(), { type: 'text', text: { body: plainMessage(order, { paid }) } })
  return metaSend(ownerNumber(), {
    type: 'template',
    template: {
      name: e.META_WA_TEMPLATE || 'nieuwe_bestelling',
      language: { code: e.META_WA_LANG || 'nl' },
      components: [{
        type: 'body',
        // Volgorde = {{1}} t/m {{7}} in het sjabloon, zie README
        parameters: [
          order.ref, order.slotLabel, `${order.name} (${order.phone})`, order.lines.map(lineText).join(' | '),
          euro(order.totalCents), payText(order, paid), order.note || '-',
        ].map((t) => ({ type: 'text', text: param(t) })),
      }],
    },
  })
}

// Verificatiecode naar de klant. Bij Meta is dat een "authentication"-sjabloon: de code staat zowel in de
// berichttekst als in de kopieerknop.
export async function sendCode(phone, code) {
  const p = provider()
  if (p === 'console') { console.log(`\n--- WhatsApp-code (testmodus) ---\nNaar: ${phone}\nCode: ${code}\n---------------------------------\n`); return }
  if (p === 'twilio') {
    const sid = process.env.TWILIO_CODE_CONTENT_SID
    return twilioSend(phone, `Je Foodplug-code is ${code}. Deze is 10 minuten geldig.`, sid ? { sid, vars: fill(process.env.TWILIO_CODE_VARS, { code }) } : undefined)
  }
  if (p !== 'meta') throw new Error('Geen WhatsApp-provider ingesteld')
  const e = process.env
  if (textMode()) return metaSend(phone, { type: 'text', text: { body: `Je Foodplug-code is ${code}. Deze is 10 minuten geldig.` } })
  return metaSend(phone, {
    type: 'template',
    template: {
      name: e.META_WA_OTP_TEMPLATE || 'bevestigingscode',
      language: { code: e.META_WA_OTP_LANG || e.META_WA_LANG || 'nl' },
      components: [
        { type: 'body', parameters: [{ type: 'text', text: code }] },
        { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
      ],
    },
  })
}
