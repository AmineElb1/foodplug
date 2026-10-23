import { useEffect, useState } from 'react'
import { getStatus } from './hoursCore.js'

export { HOURS, getStatus } from './hoursCore.js'

export function useOpenStatus() {
  const [status, setStatus] = useState(getStatus)
  useEffect(() => {
    const id = setInterval(() => setStatus(getStatus()), 60_000)
    return () => clearInterval(id)
  }, [])
  return status
}
