// Pure logica (geen React): wordt door de site én door de server (api/) gebruikt.
// Elke dag 17:30 - 01:00, maandag gesloten. De sluiting na middernacht hoort bij de avond ervoor:
// zondagavond loopt dus door tot maandag 01:00, dinsdag 00:00 - 01:00 is gesloten.
export const HOURS = { open: '17:30', close: '01:00', closedDay: 1 } // closedDay: 0 = zondag, 1 = maandag, ...
// Afhalen: eerste slot na bereidingstijd, per kwartier, laatste slot een kwartier voor sluiting.
export const PICKUP = { prepMin: 20, stepMin: 15, lastBeforeCloseMin: 15, horizonH: 48 }

const TZ = 'Europe/Brussels'
const DAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MIN = 60, DAY = 24 * MIN, WEEK = 7 * DAY
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * MIN + m }
const OPEN = toMin(HOURS.open), CLOSE = toMin(HOURS.close)

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})
// Belgische kalendertijd van een tijdstip, ongeacht de tijdzone van de bezoeker of server.
function parts(date) {
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]))
  return { dow: WD.indexOf(p.weekday), y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute }
}
const key = (y, mo, d) => `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
const addDays = (k, n) => {
  const [y, mo, d] = k.split('-').map(Number)
  const t = new Date(Date.UTC(y, mo - 1, d + n))
  return key(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate())
}
const pad = (n) => String(n).padStart(2, '0')

// De openingssessie waarin een tijdstip valt, of null als het gesloten is.
function session(date) {
  const t = parts(date)
  let m = t.h * MIN + t.mi, dow = t.dow, dateKey = key(t.y, t.mo, t.d)
  if (m < CLOSE) { dow = (t.dow + 6) % 7; dateKey = addDays(dateKey, -1); m += DAY }
  if (dow === HOURS.closedDay) return null
  if (m < OPEN || m >= CLOSE + DAY) return null
  return { dow, dateKey, m }
}

function weekMinute(date) {
  const t = parts(date)
  return t.dow * DAY + t.h * MIN + t.mi
}

export function getStatus(date = new Date()) {
  const now = weekMinute(date)
  const sessions = []
  for (let d = 0; d < 7; d++) {
    if (d === HOURS.closedDay) continue
    sessions.push([d * DAY + OPEN, d * DAY + DAY + CLOSE])
  }
  // Elke sessie ook één week eerder bekijken zodat zaterdag -> zondag klopt.
  for (const [start, end] of sessions) {
    for (const shift of [-WEEK, 0]) {
      if (now >= start + shift && now < end + shift) return { open: true, label: `Nu open, tot ${HOURS.close}` }
    }
  }
  let wait = Infinity, startDay = 0
  for (const [start] of sessions) {
    const w = (start - now + WEEK) % WEEK
    if (w < wait) { wait = w; startDay = Math.floor(start / DAY) }
  }
  const today = Math.floor(now / DAY)
  const when = startDay === today ? 'vandaag' : startDay === (today + 1) % 7 ? 'morgen' : DAYS[startDay]
  return { open: false, label: `Gesloten, opent ${when} om ${HOURS.open}` }
}

// Dag waar "vandaag" bij hoort: tijdens de late uren na middernacht is dat nog de avond ervoor.
function serviceKeyOf(date) {
  const s = session(date)
  if (s) return s.dateKey
  const t = parts(date)
  return key(t.y, t.mo, t.d)
}

function dayLabel(dateKey, nowKey) {
  if (dateKey === nowKey) return 'Vandaag'
  if (dateKey === addDays(nowKey, 1)) return 'Morgen'
  const [y, mo, d] = dateKey.split('-').map(Number)
  const dow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay()
  return `${DAYS[dow][0].toUpperCase()}${DAYS[dow].slice(1)} ${d}/${mo}`
}

// Beschikbare afhaalmomenten, gegroepeerd per dag. `grace` (min) maakt de server iets toleranter
// dan de browser, zodat een slot dat net werd gekozen niet meteen afvalt.
export function getSlots(now = new Date(), { grace = 0 } = {}) {
  const step = PICKUP.stepMin * 60000
  const end = now.getTime() + PICKUP.horizonH * 3600000
  const nowKey = serviceKeyOf(now)
  const days = new Map()
  for (let t = Math.ceil((now.getTime() + (PICKUP.prepMin - grace) * 60000) / step) * step; t <= end; t += step) {
    const d = new Date(t)
    const s = session(d)
    if (!s || s.m > CLOSE + DAY - PICKUP.lastBeforeCloseMin) continue
    if (!days.has(s.dateKey)) days.set(s.dateKey, { key: s.dateKey, label: dayLabel(s.dateKey, nowKey), times: [] })
    const p = parts(d)
    days.get(s.dateKey).times.push({ iso: d.toISOString(), label: `${pad(p.h)}:${pad(p.mi)}`, afterMidnight: s.m >= DAY })
  }
  return [...days.values()]
}

// "Zo snel mogelijk": alleen als de zaak nu open is én het eerste vrije moment nog in de huidige
// openingsavond valt (dus niet kort voor sluiting of buiten de openingstijden).
export function getAsap(now = new Date()) {
  const s = session(now)
  if (!s) return null
  const first = getSlots(now)[0]
  if (!first || first.key !== s.dateKey) return null
  return { iso: first.times[0].iso, label: first.times[0].label }
}

export function timeOf(iso) {
  const p = parts(new Date(iso))
  return `${pad(p.h)}:${pad(p.mi)}`
}

export function isValidSlot(iso, now = new Date()) {
  const t = new Date(iso)
  if (typeof iso !== 'string' || Number.isNaN(t.getTime())) return false
  const norm = t.toISOString()
  return getSlots(now, { grace: 5 }).some((d) => d.times.some((x) => x.iso === norm))
}

// Leesbare tekst, bv. "vandaag 19:15" of "dinsdag 18:00".
export function describeSlot(iso, now = new Date()) {
  const d = new Date(iso)
  const s = session(d)
  const nowKey = serviceKeyOf(now)
  const p = parts(d)
  const time = `${pad(p.h)}:${pad(p.mi)}`
  if (!s) return time
  if (s.dateKey === nowKey) return `vandaag ${time}`
  if (s.dateKey === addDays(nowKey, 1)) return `morgen ${time}`
  return `${DAYS[s.dow]} ${time}`
}
