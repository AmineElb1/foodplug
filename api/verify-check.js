import { normalizePhone } from './_lib/order.js'
import { checkCode, issueToken } from './_lib/verify.js'
import { allow, clientIp } from './_lib/limit.js'

const QUARTER = 15 * 60 * 1000

// Controleert de code en geeft een ondertekend bewijs terug dat bij het bestellen wordt meegestuurd.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Methode niet toegestaan.' })
  const phone = normalizePhone(req.body?.phone)
  if (!phone) return res.status(400).json({ error: 'Vul een geldig telefoonnummer in.' })
  if (!allow(`vc-ip:${clientIp(req)}`, 30, QUARTER) || !allow(`vc-ph:${phone}`, 10, QUARTER)) {
    return res.status(429).json({ error: 'Te veel pogingen. Wacht even en vraag een nieuwe code.' })
  }
  if (!checkCode(phone, req.body?.code)) return res.status(400).json({ error: 'Deze code klopt niet of is verlopen.' })
  const { token, exp } = issueToken(phone)
  return res.status(200).json({ ok: true, token, exp, phone })
}
