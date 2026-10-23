import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Link-previews (WhatsApp, Instagram, Facebook, ...) hebben een volledige URL voor de afbeelding nodig.
// Zet het echte domein met SITE_URL=https://jouwdomein.be bij het builden.
const SITE_URL = (process.env.SITE_URL || 'https://foodplug-one.vercel.app').replace(/\/$/, '')
const siteUrl = () => ({
  name: 'site-url',
  transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', SITE_URL),
})

// Lokaal draaien de functies in api/ via de Vite-server (op Vercel zijn het echte serverless functions).
async function readBody(req) {
  const chunks = []
  for await (const c of req) chunks.push(c)
  const raw = Buffer.concat(chunks).toString()
  const type = req.headers['content-type'] || ''
  if (type.includes('json')) { try { return JSON.parse(raw) } catch { return null } }
  if (type.includes('urlencoded')) return Object.fromEntries(new URLSearchParams(raw))
  return raw
}
const devApi = () => ({
  name: 'dev-api',
  configureServer(server) {
    const env = loadEnv(server.config.mode, process.cwd(), '')
    for (const [k, v] of Object.entries(env)) if (!(k in process.env)) process.env[k] = v
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url, 'http://localhost')
      const m = url.pathname.match(/^\/api\/([\w-]+)$/)
      if (!m) return next()
      try {
        const mod = await server.ssrLoadModule(`/api/${m[1]}.js`)
        req.query = Object.fromEntries(url.searchParams)
        req.body = await readBody(req)
        res.status = (code) => { res.statusCode = code; return res }
        res.json = (body) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); return res }
        await mod.default(req, res)
      } catch (e) {
        console.error(e)
        res.statusCode = 500
        res.end('Serverfout')
      }
    })
  },
})

export default defineConfig({ plugins: [react(), siteUrl(), devApi()] })
