import { reviews } from '../reviews.js'
import { INFO } from '../info.js'

function Stars({ rating }) {
  return (
    <span className="stars" role="img" aria-label={`${rating} van 5 sterren`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width="18" height="18" viewBox="0 0 24 24" className={n <= rating ? 'is-on' : ''} aria-hidden="true">
          <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.5 6.1 20.7l1.2-6.6L2.5 9.5l6.6-.9z" />
        </svg>
      ))}
    </span>
  )
}

export default function Reviews() {
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  return (
    <section id="reviews" className="reviews">
      <div className="wrap">
        <div className="reviews__head">
          <h2 className="h2">Wat zeggen onze klanten?</h2>
          {reviews.length > 0 && (
            <div className="reviews__avg">
              <strong>{avg.toFixed(1).replace('.', ',')}</strong>
              <Stars rating={Math.round(avg)} />
              <span>{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</span>
            </div>
          )}
        </div>

        {reviews.length > 0 ? (
          <ul className="reviews__list">
            {reviews.map((r, i) => (
              <li key={i} className="review">
                {r.image && <img className="review__img" src={r.image} alt={r.imageAlt || ''} loading="lazy" />}
                <div className="review__body">
                  <Stars rating={r.rating} />
                  <p>{r.text}</p>
                  <footer><strong>{r.name}</strong>{r.when && <span>{r.when}</span>}</footer>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="reviews__empty">Heb je al van onze cheesefries of smashburgers geproefd? Laat het ons en anderen weten.</p>
        )}

        <a className="btn btn--red reviews__cta" href={INFO.mapsUrl} target="_blank" rel="noopener noreferrer">
          <span>Laat een review achter op Google</span>
        </a>
      </div>
    </section>
  )
}
