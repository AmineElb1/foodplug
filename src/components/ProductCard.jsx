import Qty from './Qty.jsx'
import { euro } from '../format.js'

// Het plusje (of de aantalkiezer) op de foto. Gerechten met een verplichte keuze openen eerst de details.
function AddControl({ p, count, onOpen, onAdd, setQty }) {
  if (!p.options && count > 0) return <Qty qty={count} onChange={(q) => setQty(p.id, q)} label={p.name} />
  return (
    <button type="button" className="add" aria-label={`${p.name} toevoegen`} onClick={() => (p.options ? onOpen(p) : onAdd(p))}>+</button>
  )
}

// Op de kaart staan alleen foto, naam en prijs; de omschrijving staat in de detailweergave.
export default function ProductCard({ p, count, onOpen, onAdd, setQty }) {
  const add = <AddControl p={p} count={count} onOpen={onOpen} onAdd={onAdd} setQty={setQty} />
  return (
    <li className={`pcard ${p.image ? '' : 'pcard--row'}`}>
      {p.image && (
        <div className="pcard__photo">
          <button type="button" className="pcard__photo-btn" tabIndex={-1} aria-hidden="true" onClick={() => onOpen(p)}>
            <img src={p.image} alt="" loading="lazy" width="400" height="392" />
          </button>
          {p.badge && <span className="pcard__badge">{p.badge}</span>}
          {p.options && count > 0 && <span className="pcard__count" aria-label={`${count} in mandje`}>{count}</span>}
          <div className="pcard__add">{add}</div>
        </div>
      )}
      <div className="pcard__text">
        <button type="button" className="pcard__info" onClick={() => onOpen(p)} aria-label={`${p.name}, ${euro(p.price)}. Bekijk details`}>
          <span className="pcard__name">{p.name}</span>
          {p.meta && <span className="pcard__meta">{p.meta}</span>}
          <span className="pcard__price">{euro(p.price)}</span>
        </button>
        {!p.image && <div className="pcard__add pcard__add--row">{add}</div>}
      </div>
    </li>
  )
}
