import { INFO } from '../info.js'
import { HOURS, useOpenStatus } from '../hours.js'

export default function Location() {
  const status = useOpenStatus()
  return (
    <section id="locatie" className="wrap section location">
      <h2 className="h2">Bezorgen &amp; afhalen</h2>
      <div className="location__grid">
        <div>
          <dl className="facts">
            <div><dt>Adres</dt><dd>{INFO.street}<br />{INFO.city}</dd></div>
            <div><dt>Telefoon</dt><dd><a href={INFO.phoneHref}>{INFO.phone}</a></dd></div>
            <div>
              <dt>Openingsuren</dt>
              <dd>
                Dinsdag t/m zondag: {HOURS.open} - {HOURS.close}<br />
                Maandag: gesloten
                <span className={`status ${status.open ? 'is-open' : ''}`}>{status.label}</span>
              </dd>
            </div>
            <div><dt>Instagram</dt><dd><a href={INFO.instagram} target="_blank" rel="noopener noreferrer">{INFO.instagramHandle}</a></dd></div>
            <div><dt>Bezorgzone</dt><dd>[GEBIED]</dd></div>
            <div><dt>Minimum bestelbedrag</dt><dd>€ [BEDRAG]</dd></div>
          </dl>
          <div className="location__cta">
            <a className="btn btn--red" href={INFO.mapsUrl} target="_blank" rel="noopener noreferrer"><span>Route plannen</span></a>
            <a className="btn btn--ghost" href={`https://wa.me/${INFO.whatsapp}`} target="_blank" rel="noopener noreferrer"><span>WhatsApp</span></a>
          </div>
        </div>
        <div className="location__map">
          <iframe
            title={`Kaart: ${INFO.name}`}
            src={INFO.mapsEmbed}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  )
}
