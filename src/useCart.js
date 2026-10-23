import { useCallback, useEffect, useMemo, useState } from 'react'
import { productById } from './data.js'

const KEY = 'foodplug-cart-v2'

// Een mandje-regel heeft sleutel "productId" of "productId:keuzeId" (bv. het drankje bij een combo).
const lineKey = (productId, choiceId) => (choiceId ? `${productId}:${choiceId}` : productId)

function resolve(key) {
  const [id, choiceId] = key.split(':')
  const product = productById[id]
  if (!product) return null
  if (!product.options) return choiceId ? null : { product, choice: null }
  const choice = product.options.choices.find((c) => c.id === choiceId)
  return choice ? { product, choice } : null
}

// Alleen bestaande producten met een geldig aantal overnemen uit localStorage.
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    const cart = {}
    for (const [key, value] of Object.entries(raw)) {
      const q = Number(value)
      if (resolve(key) && Number.isInteger(q) && q > 0) cart[key] = Math.min(q, 99)
    }
    return cart
  } catch {
    return {}
  }
}

export function useCart() {
  const [cart, setCart] = useState(load)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(cart)) } catch { /* privémodus: mandje blijft in het geheugen */ }
  }, [cart])

  const setQty = useCallback((key, qty) => setCart((c) => {
    const next = { ...c }
    if (qty <= 0) delete next[key]
    else next[key] = Math.min(qty, 99)
    return next
  }), [])
  const add = useCallback((productId, choiceId = null, qty = 1) => setCart((c) => {
    const key = lineKey(productId, choiceId)
    return { ...c, [key]: Math.min((c[key] || 0) + qty, 99) }
  }), [])
  const clear = useCallback(() => setCart({}), [])

  const summary = useMemo(() => {
    const lines = Object.entries(cart).map(([key, qty]) => {
      const { product, choice } = resolve(key)
      return { key, ...product, choice, qty }
    })
    let count = 0, total = 0, saved = 0
    for (const l of lines) {
      count += l.qty
      total += l.qty * l.price
      saved += l.qty * ((l.oldPrice || l.price) - l.price)
    }
    // Totaal aantal per gerecht (alle varianten samen), voor de teller op de kaarten.
    const perProduct = {}
    for (const l of lines) perProduct[l.id] = (perProduct[l.id] || 0) + l.qty
    return { lines, count, total, saved, perProduct }
  }, [cart])

  return { add, setQty, clear, ...summary }
}
