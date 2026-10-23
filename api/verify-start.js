import { normalizePhone } from './_lib/order.js'
import { sendCode } from './_lib/notify.js'
import { currentCode } from './_lib/verify.js'
import { cashReady, verificationRequired } from './_lib/features.js'
import { allow, clientIp } from './_lib/limit.js'

const QUARTER = 15 * 60 * 1000

// Stuurt een code via WhatsApp naar het opgegeven nummer.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Methode niet toegestaan.' })
  if (!verificationRequired()) return res.status(200).json({ ok: true, skipped: true })
  if (!cashReady()) return res.status(503).json({ error: 'Verifiëren is nog niet beschikbaar. Kies online betalen of bel ons.' })

  const phone = normalizePhone(req.body?.phone)
  if (!phone) return res.status(400).json({ error: 'Vul een geldig telefoonnummer in.' })
  // Zo kan niemand de code van een willekeurig nummer blijven opvragen (best effort, zie limit.js).
  if (!allow(`vs-ip:${clientIp(req)}`, 10, QUARTER) || !allow(`vs-ph:${phone}`, 3, QUARTER) || !allow(`vs-ph1:${phone}`, 1, 30_000)) {
    return res.status(429).json({ error: 'Even geduld, je kunt over een halve minuut een nieuwe code vragen.' })
  }
  try {
    await sendCode(phone, currentCode(phone))
  } catch (e) {
    console.error('Code versturen mislukt:', e.message)
    return res.status(502).json({ error: 'We konden de code niet versturen. Controleer je nummer of kies online betalen.' })
  }
  return res.status(200).json({ ok: true })
}
