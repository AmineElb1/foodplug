// Eenvoudige begrenzing in het geheugen van de server. Dit is "best effort": op Vercel kunnen er
// meerdere instanties draaien en het geheugen verdwijnt bij een herstart. Voor harde limieten:
// Vercel Firewall > Rate Limiting (zie README).
const buckets = new Map()

export function allow(key, max, windowMs, now = Date.now()) {
  const recent = (buckets.get(key) || []).filter((t) => now - t < windowMs)
  if (recent.length >= max) { buckets.set(key, recent); return false }
  recent.push(now)
  buckets.set(key, recent)
  if (buckets.size > 5000) for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k)
  return true
}

export const clientIp = (req) => String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'onbekend').split(',')[0].trim()
