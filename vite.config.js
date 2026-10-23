import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Link-previews (WhatsApp, Instagram, Facebook, ...) hebben een volledige URL voor de afbeelding nodig.
// Zet het echte domein met SITE_URL=https://jouwdomein.be bij het builden.
const SITE_URL = (process.env.SITE_URL || 'https://foodplug-one.vercel.app').replace(/\/$/, '')
const siteUrl = () => ({
  name: 'site-url',
  transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', SITE_URL),
})

export default defineConfig({ plugins: [react(), siteUrl()] })
