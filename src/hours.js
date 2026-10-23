import { useEffect, useState } from 'react'

// Elke dag 17:30 - 01:00, maandag gesloten. De sluiting na middernacht hoort bij de avond ervoor:
// zondagavond loopt dus door tot maandag 01:00, dinsdag 00:00 - 01:00 is gesloten.
export const HOURS = { open: '17:30', close: '01:00', closedDay: 1 } // closedDay: 0 = zondag, 1 = maandag, ...

const DAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']
const MIN = 60, DAY = 24 * MIN, WEEK = 7 * DAY
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * MIN + m }
const OPEN = toMin(HOURS.open), CLOSE = toMin(HOURS.close)

// Minuten sinds zondag 00:00, in Belgische tijd (ongeacht de tijdzone van de bezoeker).
function weekMinute(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Brussels', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(date).map((p) => [p.type, p.value]),
  )
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday)
  return day * DAY + Number(parts.hour) * MIN + Number(parts.minute)
}

export function getStatus(date = new Date()) {
  const now = weekMinute(date)
  const sessions = []
  for (let d = 0; d < 7; d++) {
    if (d === HOURS.closedDay) continue
    sessions.push([d * DAY + OPEN, d * DAY + DAY + CLOSE])
  }
  // Elke sessie ook één week eerder/later bekijken zodat zaterdag -> zondag klopt.
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

export function useOpenStatus() {
  const [status, setStatus] = useState(getStatus)
  useEffect(() => {
    const id = setInterval(() => setStatus(getStatus()), 60_000)
    return () => clearInterval(id)
  }, [])
  return status
}
