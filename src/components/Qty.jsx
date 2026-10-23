export default function Qty({ qty, onChange, label }) {
  return (
    <div className="qty" role="group" aria-label={`Aantal ${label}`}>
      <button type="button" aria-label={`Minder ${label}`} onClick={() => onChange(qty - 1)}>−</button>
      <output aria-live="polite">{qty}</output>
      <button type="button" aria-label={`Meer ${label}`} onClick={() => onChange(qty + 1)}>+</button>
    </div>
  )
}
