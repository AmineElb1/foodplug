import { notificationsReady } from './notify.js'
import { mollieReady } from './mollie.js'
import { verifySecretReady } from './verify.js'

// Telefoonverificatie staat standaard aan voor cash-bestellingen. PHONE_VERIFICATION=off schakelt het
// uit (alleen om te testen, bv. zolang het WhatsApp-sjabloon voor codes nog niet is goedgekeurd).
export const verificationRequired = () => process.env.PHONE_VERIFICATION !== 'off'

export const onlineReady = () => notificationsReady() && mollieReady()
export const cashReady = () => notificationsReady() && (!verificationRequired() || verifySecretReady())
