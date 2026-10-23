import { onlineReady, cashReady, verificationRequired } from './_lib/features.js'

// Laat de site weten wat er werkt: zonder meldingen geen bestellen, zonder Mollie geen online betalen.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ online: onlineReady(), cash: cashReady(), verify: verificationRequired() })
}
