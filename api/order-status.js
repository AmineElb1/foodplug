import { decodeMeta } from './_lib/order.js'
import { getPayment, mollieReady } from './_lib/mollie.js'

// Status van een online betaling, voor de bevestigingspagina na het betalen.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const id = String(req.query?.pid ?? '')
  if (!mollieReady() || !/^tr_[A-Za-z0-9]+$/.test(id)) return res.status(400).json({ error: 'Ongeldige aanvraag.' })
  try {
    const payment = await getPayment(id)
    const order = decodeMeta(payment.metadata)
    res.status(200).json({
      status: payment.status, ref: order?.ref ?? null, slotLabel: order?.slotLabel ?? null,
      total: payment.amount?.value ?? null,
    })
  } catch (e) {
    console.error('Status ophalen mislukt:', e.message)
    res.status(502).json({ error: 'Status ophalen mislukt.' })
  }
}
