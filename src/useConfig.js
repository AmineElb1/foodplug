import { useEffect, useState } from 'react'

// Wat de server aankan: zonder WhatsApp-melding geen bestellen, zonder Mollie geen online betalen,
// en of cash eerst een telefoonverificatie vraagt.
export function useConfig() {
  const [config, setConfig] = useState({ loaded: false, cash: false, online: false, verify: true })
  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((j) => setConfig({ loaded: true, cash: !!j.cash, online: !!j.online, verify: j.verify !== false }))
      .catch(() => setConfig({ loaded: true, cash: false, online: false, verify: true }))
  }, [])
  return config
}
