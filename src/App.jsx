import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Logo from './components/Logo.jsx'
import Halal from './components/Halal.jsx'
import Menu from './components/Menu.jsx'
import ProductSheet from './components/ProductSheet.jsx'
import CartDrawer from './components/CartDrawer.jsx'
import Reviews from './components/Reviews.jsx'
import Location from './components/Location.jsx'
import OrderReturn from './components/OrderReturn.jsx'
import { useCart } from './useCart.js'
import { useConfig } from './useConfig.js'
import { euro } from './format.js'
import { INFO } from './info.js'

// three.js is zwaar: laad de 3D-scène los van de rest van de pagina.
const ModelCarousel = lazy(() => import('./components/ModelCarousel.jsx'))

export default function App() {
  const { add, setQty, clear, lines, count, total, saved, perProduct } = useCart()
  const config = useConfig()
  const [sheet, setSheet] = useState(null)
  // Mollie stuurt de klant terug naar /?order=FP-XXXX
  const [orderRef, setOrderRef] = useState(() => {
    const r = new URLSearchParams(window.location.search).get('order')
    return /^FP-[A-Z0-9]{4}$/.test(r || '') ? r : null
  })
  const [toast, setToast] = useState('')
  const toastTimer = useRef(0)
  const [cartOpen, setCartOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const closeCart = useCallback(() => setCartOpen(false), [])
  const closeSheet = useCallback(() => setSheet(null), [])
  const closeReturn = useCallback(() => {
    window.history.replaceState({}, '', window.location.pathname)
    setOrderRef(null)
  }, [])

  const notify = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }, [])
  const quickAdd = useCallback((p) => { add(p.id); notify(`${p.name} toegevoegd`) }, [add, notify])
  const addFromSheet = useCallback((p, choice, qty) => {
    add(p.id, choice?.id ?? null, qty)
    setSheet(null)
    notify(`${p.name} toegevoegd`)
  }, [add, notify])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div id="top" className={`app ${count > 0 ? 'has-cart' : ''}`}>
      <div className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
        <header className="wrap header">
          <a href="#top" className="header__logo" aria-label="Food Plug, naar boven"><Logo /></a>
          <nav className="nav" aria-label="Hoofdmenu">
            <a href="#menu">Menu</a>
            <a href="#reviews">Reviews</a>
            <a href="#locatie">Locatie</a>
          </nav>
          <button className="icon-btn" aria-label={`Winkelmandje, ${count} items`} onClick={() => setCartOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 8h14l-1.2 11H6.2z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            {count > 0 && <span key={count} className="badge">{count}</span>}
          </button>
        </header>
      </div>

      <section className="hero">
        <div className="wrap hero__inner">
          <h1 className="hero__title">Eat.<br />Good.<br />Plug in.</h1>
          <div className="hero__stage">
            <div className="hero__plate" />
            <div className="hero__canvas">
              <Suspense fallback={null}><ModelCarousel /></Suspense>
            </div>
            <Halal size={84} className="halal--hero" />
          </div>
          <div className="hero__cta">
            <a href="#menu" className="btn btn--red"><span>Bestel nu</span></a>
            <a href="#locatie" className="btn btn--ghost"><span>Locatie</span></a>
          </div>
        </div>
      </section>

      <div className="strip">Try it before its illegal</div>

      <Menu perProduct={perProduct} onOpen={setSheet} onAdd={quickAdd} setQty={setQty} />

      <section className="steps">
        <div className="wrap">
          <h2 className="h2 h2--dark">Zo plug je in</h2>
          <ol>
            <li><b>1</b><span><strong>Kies</strong> je eten, drinken en dessert</span></li>
            <li><b>2</b><span>Kies je <strong>afhaalmoment</strong> en betaal <strong>online</strong> of <strong>cash</strong></span></li>
            <li><b>3</b><span><strong>Haal af</strong> en geniet. Je bestelling staat klaar</span></li>
          </ol>
        </div>
      </section>

      <Reviews />
      <Location />

      <footer className="footer">
        <div className="wrap footer__inner">
          <Logo inverted />
          <p>
            {INFO.street}, {INFO.city}<br />
            <a href={INFO.phoneHref}>{INFO.phone}</a><br />
            <a href={INFO.instagram} target="_blank" rel="noopener noreferrer">Instagram {INFO.instagramHandle}</a><br />
            [E-MAIL]
          </p>
          <Halal size={64} />
          <small>© Food Plug</small>
        </div>
      </footer>

      {count > 0 && (
        <div className="cartbar">
          <div className="wrap cartbar__inner">
            <button className="cartbar__btn" onClick={() => setCartOpen(true)}>
              <span>Bekijk mandje ({count})</span>
              <span>{euro(total)}</span>
            </button>
          </div>
        </div>
      )}

      {sheet && <ProductSheet key={sheet.id} product={sheet} onClose={closeSheet} onAdd={addFromSheet} />}

      <div className={`toast ${toast ? 'is-on' : ''} ${count > 0 ? 'has-cart' : ''}`} role="status" aria-live="polite">{toast}</div>

      <CartDrawer open={cartOpen} onClose={closeCart} items={lines} count={count} total={total} saved={saved} setQty={setQty} clear={clear} config={config} />

      {orderRef && <OrderReturn refCode={orderRef} onClose={closeReturn} onPaid={clear} />}
    </div>
  )
}
