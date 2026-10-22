import { useMemo, useState } from 'react'
import BurgerScene from './components/BurgerScene.jsx'
import Logo from './components/Logo.jsx'
import Halal from './components/Halal.jsx'
import { categories, products } from './data.js'

const euro = (n) => `€ ${n.toFixed(2).replace('.', ',')}`

export default function App() {
  const [cart, setCart] = useState({})
  const [active, setActive] = useState('burgers')

  const add = (id) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }))
  const { count, total } = useMemo(() => {
    let count = 0, total = 0
    for (const p of products) { const q = cart[p.id] || 0; count += q; total += q * p.price }
    return { count, total }
  }, [cart])

  return (
    <div className="app">
      <header className="wrap header">
        <Logo />
        <button className="icon-btn" aria-label={`Winkelmandje, ${count} items`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 8h14l-1.2 11H6.2z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" />
          </svg>
          {count > 0 && <span className="badge">{count}</span>}
        </button>
      </header>

      <section className="hero">
        <div className="wrap hero__inner">
          <h1 className="hero__title">Eet.<br />Drink.<br />Plug in.</h1>
          <div className="hero__stage">
            <div className="hero__plate" />
            <div className="hero__canvas"><BurgerScene /></div>
            <Halal size={84} className="halal--hero" />
          </div>
          <div className="hero__cta">
            <a href="#menu" className="btn btn--red"><span>Bestel nu</span></a>
            <a href="#menu" className="btn btn--ghost"><span>Menu</span></a>
          </div>
        </div>
      </section>

      <div className="strip">Try it before its illegal</div>

      <section id="menu" className="wrap section">
        <h2 className="h2">Wat wil je pluggen?</h2>
        <div className="tiles">
          {categories.map((c) => (
            <button
              key={c.id}
              className={`tile tile--${c.tone} ${active === c.id ? 'is-active' : ''}`}
              onClick={() => setActive(c.id)}
              aria-pressed={active === c.id}
            >
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        <ul className="list">
          {products.filter((p) => p.cat === active).map((p) => (
            <li key={p.id} className="card">
              <div className="card__img" aria-hidden="true" />
              <div className="card__body">
                {p.badge && <span className="card__badge">{p.badge}</span>}
                <div className="card__name">{p.name}</div>
                <div className="card__desc">{p.desc}</div>
                <div className="card__price">
                  {euro(p.price)}
                  {p.oldPrice && <s>{euro(p.oldPrice)}</s>}
                </div>
              </div>
              <button className="add" aria-label={`${p.name} toevoegen`} onClick={() => add(p.id)}>+</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="steps">
        <div className="wrap">
          <h2 className="h2 h2--dark">Zo plug je in</h2>
          <ol>
            <li><b>1</b><span><strong>Kies</strong> je eten, drinken en dessert</span></li>
            <li><b>2</b><span><strong>Bezorgen</strong> of <strong>afhalen</strong>: jij beslist</span></li>
            <li><b>3</b><span><strong>Betaal</strong> en geniet. Klaar in [MINUTEN] min</span></li>
          </ol>
        </div>
      </section>

      <section className="wrap section">
        <h2 className="h2 h2--sm">Bezorgen &amp; afhalen</h2>
        <p>Bezorgzone: [GEBIED]<br />Minimum bestelbedrag: € [BEDRAG]<br />Openingsuren: [UREN]</p>
      </section>

      <footer className="footer">
        <div className="wrap footer__inner">
          <Logo inverted />
          <p>[ADRES]<br /><a href="tel:+32492825755">+32 492 82 57 55</a><br />[E-MAIL]</p>
          <Halal size={64} />
          <small>© Food Plug</small>
        </div>
      </footer>

      <div className="cartbar">
        <div className="wrap cartbar__inner">
          <button className="cartbar__btn" disabled={count === 0}>
            <span>Bekijk mandje{count > 0 ? ` (${count})` : ''}</span>
            <span>{euro(total)}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
