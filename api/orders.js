import { buildOrder, encodeMeta, euro } from './_lib/order.js'
import { notifyOwner } from './_lib/notify.js'
import { checkToken } from './_lib/verify.js'
import { allow, clientIp } from './_lib/limit.js'
import { cashReady, onlineReady, verificationRequired } from './_lib/features.js'
import { createPayment } from './_lib/mollie.js'
import { siteUrl, isLocal } from './_lib/site.js'

const CALL_US = 'Probeer het opnieuw of bel ons even.'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Methode niet toegestaan.' })
  if (!cashReady() && !onlineReady()) return res.status(503).json({ error: `Online bestellen is nog niet actief. ${CALL_US}` })
  if (!allow(`ord-ip:${clientIp(req)}`, 8, 10 * 60 * 1000)) return res.status(429).json({ error: 'Je hebt net al meerdere bestellingen geplaatst. Probeer het later opnieuw of bel ons.' })

  const { order, error } = buildOrder(req.body)
  if (error) return res.status(400).json({ error })

  if (order.method === 'cash') {
    if (!cashReady()) return res.status(503).json({ error: 'Cash bestellen is nog niet beschikbaar. Kies online betalen of bel ons.' })
    // Cash wordt pas geplaatst nadat het telefoonnummer is bevestigd met een code.
    if (verificationRequired() && !checkToken(req.body?.verifyToken, order.phone)) {
      return res.status(403).json({ error: 'Bevestig eerst je telefoonnummer.', code: 'verify' })
    }
    try {
      await notifyOwner(order, { paid: false })
    } catch (e) {
      // Zonder melding aan de zaak mag de klant niet denken dat de bestelling is gelukt.
      console.error('Melding mislukt (cash):', e.message)
      return res.status(502).json({ error: `Je bestelling kon niet worden doorgegeven. ${CALL_US}` })
    }
    return res.status(200).json({ status: 'confirmed', ref: order.ref, slotLabel: order.slotLabel, totalCents: order.totalCents })
  }

  if (!onlineReady()) return res.status(503).json({ error: 'Online betalen is nog niet beschikbaar. Kies cash bij afhalen.' })
  const meta = encodeMeta(order)
  if (JSON.stringify(meta).length > 950) return res.status(400).json({ error: 'Deze bestelling is te groot om online te betalen. Maak de opmerking korter.' })

  const site = siteUrl(req)
  try {
    const payment = await createPayment({
      amount: { currency: 'EUR', value: (order.totalCents / 100).toFixed(2) },
      description: `Foodplug bestelling ${order.ref}`,
      redirectUrl: `${site}/?order=${order.ref}`,
      ...(isLocal(site) ? {} : { webhookUrl: `${site}/api/mollie-webhook` }),
      locale: 'nl_BE',
      metadata: meta,
    })
    return res.status(200).json({
      status: 'payment', ref: order.ref, paymentId: payment.id, checkoutUrl: payment._links.checkout.href,
      slotLabel: order.slotLabel, totalCents: order.totalCents,
    })
  } catch (e) {
    console.error('Mollie mislukt:', e.message)
    return res.status(502).json({ error: `Betalen lukt even niet. Kies cash bij afhalen of probeer later opnieuw (${euro(order.totalCents)}).` })
  }
}
