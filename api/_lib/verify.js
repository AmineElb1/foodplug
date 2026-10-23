import crypto from 'node:crypto'

// Telefoonverificatie zonder database: de code is een HMAC van nummer + tijdvenster, de bewijsstempel
// (token) een ondertekende vervaldatum. Alleen wij kennen VERIFY_SECRET, dus niemand kan ze namaken.
const WINDOW_MS = 10 * 60 * 1000 // een code is 10 tot 20 minuten geldig
export const TOKEN_TTL_MIN = Number(process.env.VERIFY_TOKEN_TTL_MIN) || 120

const secret = () => process.env.VERIFY_SECRET || (process.env.VERCEL ? '' : 'alleen-voor-lokaal-testen')
export const verifySecretReady = () => !!secret()

const hmac = (data) => crypto.createHmac('sha256', secret()).update(data).digest()
const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(a, b)

const codeFor = (phone, win) => String(hmac(`code|${phone}|${win}`).readUInt32BE(0) % 1_000_000).padStart(6, '0')
export const currentCode = (phone, now = Date.now()) => codeFor(phone, Math.floor(now / WINDOW_MS))

export function checkCode(phone, code, now = Date.now()) {
  const c = String(code ?? '').replace(/\D/g, '')
  if (c.length !== 6) return false
  const w = Math.floor(now / WINDOW_MS)
  return [w, w - 1].some((x) => same(Buffer.from(codeFor(phone, x)), Buffer.from(c)))
}

export function issueToken(phone, now = Date.now()) {
  const exp = now + TOKEN_TTL_MIN * 60000
  const body = Buffer.from(JSON.stringify({ p: phone, e: exp })).toString('base64url')
  return { token: `${body}.${hmac(`token|${body}`).toString('base64url')}`, exp }
}

export function checkToken(token, phone, now = Date.now()) {
  const [body, sig] = String(token ?? '').split('.')
  if (!body || !sig) return false
  if (!same(hmac(`token|${body}`), Buffer.from(sig, 'base64url'))) return false
  try {
    const { p, e } = JSON.parse(Buffer.from(body, 'base64url').toString())
    return p === phone && e > now
  } catch { return false }
}
