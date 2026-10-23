// Basis-URL van de site (voor Mollie-redirect en webhook).
export function siteUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '')
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost'
  const local = /^(localhost|127\.|\[::1\])/.test(host)
  return `${local ? 'http' : 'https'}://${host}`
}
// Mollie weigert een webhook die het niet kan bereiken (localhost).
export const isLocal = (url) => /^https?:\/\/(localhost|127\.|\[::1\])/.test(url)
