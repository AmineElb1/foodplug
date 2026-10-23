const BASE = 'https://api.mollie.com/v2'

export const mollieReady = () => !!process.env.MOLLIE_API_KEY

async function call(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.MOLLIE_API_KEY}`, 'Content-Type': 'application/json', ...init.headers },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(`Mollie ${res.status}: ${data.detail || data.title || res.statusText}`), { status: res.status })
  return data
}

export const createPayment = (body) => call('/payments', { method: 'POST', body: JSON.stringify(body) })
export const getPayment = (id) => call(`/payments/${encodeURIComponent(id)}`)
