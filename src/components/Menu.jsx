import { useEffect, useRef, useState } from 'react'
import ProductCard from './ProductCard.jsx'
import { categories, products } from '../data.js'
import { useOpenStatus } from '../hours.js'

const SECTIONS = [{ id: 'populair', label: 'Populair' }, ...categories]
const featured = products.filter((p) => p.featured)

export default function Menu({ perProduct, onOpen, onAdd, setQty }) {
  const status = useOpenStatus()
  const [active, setActive] = useState(SECTIONS[0].id)
  const bar = useRef(null)
  const lockUntil = useRef(0)

  // Scrollspy: de chip van de sectie die onder de vaste balken in beeld komt, licht op.
  useEffect(() => {
    const visible = new Set()
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) (e.isIntersecting ? visible.add(e.target.dataset.sec) : visible.delete(e.target.dataset.sec))
      if (Date.now() < lockUntil.current) return
      const first = SECTIONS.find((s) => visible.has(s.id))
      if (first) setActive(first.id)
    }, { rootMargin: '-170px 0px -55% 0px' })
    document.querySelectorAll('[data-sec]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  // Actieve chip horizontaal in beeld houden (zonder de pagina zelf te laten scrollen).
  useEffect(() => {
    const el = bar.current?.querySelector('.chip.is-active')
    if (!el) return
    bar.current.scrollTo({ left: el.offsetLeft - (bar.current.clientWidth - el.clientWidth) / 2, behavior: 'smooth' })
  }, [active])

  const jump = (e, id) => {
    e.preventDefault()
    lockUntil.current = Date.now() + 900
    setActive(id)
    document.getElementById(`menu-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const card = (p) => (
    <ProductCard key={p.id} p={p} count={perProduct[p.id] || 0} onOpen={onOpen} onAdd={onAdd} setQty={setQty} />
  )

  return (
    <section id="menu" className="menu">
      <div className="menu__banner">
        <img src="/menu-banner.jpg" alt="Cheesefries en smashburgers van Foodplug" />
        <div className="wrap menu__bannertext">
          <h2 className="h2 h2--light">Wat wil je pluggen?</h2>
          <span className={`pill ${status.open ? 'is-open' : ''}`}>{status.label}</span>
        </div>
      </div>

      <nav className="catnav" aria-label="Menucategorieën">
        <div className="wrap catnav__wrap">
          <div className="catnav__scroll" ref={bar}>
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#menu-${s.id}`} className={`chip ${active === s.id ? 'is-active' : ''}`}
                aria-current={active === s.id ? 'true' : undefined} onClick={(e) => jump(e, s.id)}>
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <div className="wrap menu__body">
        <section id="menu-populair" data-sec="populair" className="msec" aria-labelledby="h-populair">
          <h3 id="h-populair" className="msec__title">Populair</h3>
          <ul className="grid grid--featured">{featured.map(card)}</ul>
        </section>

        {categories.map((c) => {
          const items = products.filter((p) => p.cat === c.id)
          const photos = items.some((p) => p.image)
          return (
            <section key={c.id} id={`menu-${c.id}`} data-sec={c.id} className="msec" aria-labelledby={`h-${c.id}`}>
              <h3 id={`h-${c.id}`} className="msec__title">{c.label}</h3>
              <ul className={`grid ${photos ? '' : 'grid--rows'}`}>{items.map(card)}</ul>
            </section>
          )
        })}
      </div>
    </section>
  )
}
