import { useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href],button:not([disabled]),input,textarea,[tabindex]:not([tabindex="-1"])'

// Gedeeld gedrag voor modale vensters: scroll vergrendelen, Escape, focus binnen het venster houden
// en de focus teruggeven aan de knop die het opende.
export function useDialog(open, onClose, initialFocus) {
  const panel = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    initialFocus?.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') return onCloseRef.current()
      if (e.key !== 'Tab' || !panel.current) return
      const els = [...panel.current.querySelectorAll(FOCUSABLE)]
      if (!els.length) return
      const first = els[0], last = els[els.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      opener?.focus?.()
    }
  }, [open, initialFocus])

  return panel
}
