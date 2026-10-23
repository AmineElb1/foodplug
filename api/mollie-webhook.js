import { decodeMeta } from './_lib/order.js'
import { notifyOwner } from './_lib/notify.js'
import { getPayment } from './_lib/mollie.js'

const FRESH_MS = 30 * 60 * 1000 // oudere "paid"-meldingen (bv. na een terugbetaling) negeren we

// Mollie roept dit aan bij elke statuswijziging van een betaling. We halen de betaling zelf op bij
// Mollie (de melding bevat alleen een id) en sturen pas een WhatsApp als het echt betaald is.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const id = String(req.body?.id ?? '')
  if (!/^tr_[A-Za-z0-9]+$/.test(id)) return res.status(400).end()

  try {
    const payment = await getPayment(id)
    const refunded = Number(payment.amountRefunded?.value || 0) > 0
    const fresh = payment.paidAt && Date.now() - new Date(payment.paidAt).getTime() < FRESH_MS
    if (payment.status === 'paid' && !refunded && fresh) {
      const order = decodeMeta(payment.metadata)
      if (!order) throw new Error(`Onleesbare metadata bij ${id}`)
      await notifyOwner(order, { paid: true })
    }
    return res.status(200).end()
  } catch (e) {
    // 500 laat Mollie het later opnieuw proberen (tot 10 keer).
    console.error('Webhook mislukt:', e.message)
    return res.status(500).end()
  }
}
