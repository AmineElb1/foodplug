// Telefoonnummer naar internationaal formaat: +32 / 0032 / 04.. -> +324.. ; null bij een onbruikbaar nummer.
// Wordt door de site én de server gebruikt, zodat beide hetzelfde nummer bedoelen.
export function normalizePhone(raw) {
  let p = String(raw ?? '').replace(/[\s.\-/()]/g, '')
  if (!p) return null
  if (p.startsWith('00')) p = `+${p.slice(2)}`
  else if (p.startsWith('0')) p = `+32${p.slice(1)}`
  else if (!p.startsWith('+')) p = `+${p}`
  return /^\+\d{9,15}$/.test(p) ? p : null
}
