# Food Plug

React + Vite + react-three-fiber, met serverless functions (map `api/`) voor bestellen en betalen.
De 3D burger staat in `public/burger_2.glb`.

    npm install
    npm run dev        # site + api/ lokaal op http://localhost:5173

## Hoe bestellen werkt

Alleen afhalen (bezorgen kan via Uber Eats en Deliveroo). De klant kiest een afhaalmoment (of "zo snel
mogelijk", alleen als de zaak open is) en betaalt **online** (Mollie: Bancontact, kaart, Apple Pay) of
**cash bij afhalen**. De zaak krijgt bij elke bestelling een WhatsApp-bericht.

- **Cash**: de klant bevestigt eerst zijn nummer met een code via WhatsApp. Daarna komt de bestelling
  meteen binnen. Lukt de WhatsApp naar de zaak niet, dan krijgt de klant een foutmelding.
- **Online**: de WhatsApp volgt pas **nadat Mollie de betaling bevestigt** (webhook). Hier is geen code
  nodig: de betaling zelf is de bevestiging.
- **Tijden**: elk kwartier, 20 minuten bereidingstijd, laatste moment 15 minuten voor sluiting. Tijden in
  het verleden kunnen niet gekozen worden, ook niet als het venster lang openstaat. Instellingen staan in
  `src/hoursCore.js` (`HOURS`, `PICKUP`).
- Prijzen worden altijd op de server herberekend uit `src/data.js`.
- Zonder ingestelde WhatsApp (op Vercel) blijft bestellen automatisch uit en toont de site het belnummer.
  Zonder Mollie-sleutel is alleen cash beschikbaar. Zonder `VERIFY_SECRET` staat cash uit.

### Telefoonverificatie
Er is geen database nodig: de code is een handtekening (HMAC) van nummer + tijdvenster, geldig 10 tot 20
minuten. Na een juiste code krijgt de browser een ondertekend bewijs (standaard 2 uur geldig, per nummer),
zodat een terugkerende klant niet elke keer opnieuw een code krijgt. Er is ook een begrenzing per nummer en
per IP, maar die zit in het geheugen van de server en is dus *best effort*. Voor harde limieten:
**Vercel Firewall > Rate Limiting** op `/api/verify-start`, `/api/verify-check` en `/api/orders`.
`PHONE_VERIFICATION=off` schakelt het uit (alleen om te testen).

## Instellen (omgevingsvariabelen)

Zie `.env.example`. Lokaal in `.env.local`, op Vercel onder Project Settings > Environment Variables.
Zet daar ook `VERIFY_SECRET` (bv. `openssl rand -hex 32`).

### Mollie
1. Account op mollie.com, zet in het dashboard Bancontact, kaarten en Apple Pay aan.
2. Kopieer de **test**-sleutel (`test_...`) naar `MOLLIE_API_KEY`. In testmodus verschijnt bij het
   betalen een scherm waar je "betaald / mislukt / geannuleerd" kiest.
3. Live gaan: bedrijfsgegevens laten verifiëren bij Mollie en de `live_...`-sleutel gebruiken.

De webhook (`/api/mollie-webhook`) wordt automatisch meegegeven bij elke betaling. Hij werkt alleen
op een publiek bereikbare URL (dus op Vercel, niet op localhost).

### WhatsApp testen met Twilio (sandbox)
Voor een snelle test zonder Meta. Alleen nummers die de sandbox "joinden" ontvangen berichten, dus dit is niet
voor echte klanten. Gratis proefaccount: 100 WhatsApp-berichten.
1. Maak een account op twilio.com/try-twilio.
2. Open de WhatsApp-sandbox (Console > Messaging > Try it out > Send a WhatsApp message). Je ziet het sandbox-nummer
   (+1 415 523 8886) en een code als `join woord-woord`.
3. Stuur vanaf de telefoon die de meldingen moet ontvangen (+32485117492) dat bericht via WhatsApp naar dat nummer.
   Je krijgt een bevestiging. De deelname geldt 3 dagen; daarna opnieuw `join` sturen.
4. Zet in `.env.local`: `WHATSAPP_PROVIDER=twilio`, `OWNER_WHATSAPP=+32485117492`, `TWILIO_ACCOUNT_SID=...` en
   `TWILIO_AUTH_TOKEN=...` (Console-startpagina > Account Info). Herstart `npm run dev`.
5. **Proefaccount:** Twilio staat geen eigen tekst toe, alleen sjablonen (zie `TWILIO_*_CONTENT_SID` en
   `TWILIO_*_VARS` in `.env.example`). Open de pagina "Try out WhatsApp" voor de beschikbare sjablonen. De
   berichten hebben dan de vaste tekst van Twilio, handig om te zien dat alles werkt, niet voor klanten.
6. Plaats een bestelling. Gewone tekst (betaald account) werkt tot 24 uur na je laatste bericht aan de sandbox; stuur anders
   opnieuw een berichtje. Wil je ook de verificatiecode testen, gebruik dan +32485117492 als klantnummer.

### WhatsApp (Meta Cloud API)
`WHATSAPP_PROVIDER=console` toont berichten alleen in de terminal (lokaal testen, ook de codes).
Voor live gebruik: de **Meta WhatsApp Cloud API** (`WHATSAPP_PROVIDER=meta`).

**Snel testen naar +32485117492 (gratis, zonder goedgekeurd sjabloon):**
1. developers.facebook.com: maak een app (type Business) en voeg het product WhatsApp toe.
2. Onder WhatsApp > API Setup staat een gratis testnummer. Voeg `+32485117492` toe als ontvanger en
   bevestig met de code die je in WhatsApp krijgt.
3. Zet in `.env.local`: `WHATSAPP_PROVIDER=meta`, `META_WA_MODE=text`, `OWNER_WHATSAPP=+32485117492`,
   `META_WA_PHONE_ID=<Phone number ID>` en `META_WA_TOKEN=<tijdelijk token, 24 uur geldig>`.
4. Stuur vanaf +32485117492 één bericht ("hallo") naar het testnummer. Dat opent een venster van 24 uur
   waarin gewone tekst mag. Herstart `npm run dev`.
5. Plaats een bestelling. Wil je ook de verificatiecode testen, gebruik dan +32485117492 als klantnummer
   (of zet tijdelijk `PHONE_VERIFICATION=off`).

**Live (met sjablonen, werkt voor alle klanten):** `META_WA_MODE=template` en twee goedgekeurde sjablonen:
- `nieuwe_bestelling` (Utility, Nederlands), 7 parameters:
  `Nieuwe bestelling {{1}}. Afhalen: {{2}}. Klant: {{3}}. Bestelling: {{4}}. Totaal: {{5}}. Betaling: {{6}}. Opmerking: {{7}}`
- `bevestigingscode` (categorie Authentication, Nederlands, knop "Code kopiëren")

Een eigen, echt WhatsApp Business-nummer is nodig om codes naar elke klant te sturen: het gratis testnummer
mag maar naar een beperkt aantal vooraf toegevoegde nummers sturen. Een tijdelijk token duurt 24 uur; voor
blijvend gebruik een System User-token met `whatsapp_business_messaging`. De exacte schermen in Meta kunnen
afwijken; volg de actuele documentatie van Meta.

## Bestanden

- `src/data.js`: menu en prijzen (ook door de server gebruikt)
- `src/hoursCore.js`: openingstijden, afhaalslots en "zo snel mogelijk" (ook door de server gebruikt)
- `src/phone.js`: nummers normaliseren (site en server)
- `src/components/CartDrawer.jsx`: mandje en afrekenen
- `api/`: `orders` (bestelling plaatsen), `verify-start` en `verify-check` (telefoonverificatie),
  `mollie-webhook`, `order-status`, `config`
- `src/components/Burger.jsx`, `BurgerScene.jsx`: 3D model

## 3D-modellen (hero)

De hero toont de modellen uit `src/models.js` om de 7 seconden na elkaar, met een in/uit-animatie. Ze draaien
alleen wanneer je scrolt (er wordt zonder scrollen niets getekend). Hovert de muis erboven, dan wisselt hij niet.

Model toevoegen:
1. Zet het bronbestand (`.glb`) in `models-src/` (niet in git) en maak er een lichte versie van:
   `npx @gltf-transform/cli optimize bron.glb public/models/naam.glb --simplify true --simplify-ratio 0.1 --simplify-error 0.003 --compress meshopt --texture-compress webp --texture-size 2048`
   Het verkleint ~1,3 miljoen driehoeken naar ~130 duizend (8 MB wordt 1,6 MB) zonder zichtbaar verschil.
2. Voeg een regel toe aan `MODELS` in `src/models.js` (`id`, `url`, `label`, `href`, `size`). `size` zijn de afmetingen
   [x, y, z] van het model; de rest (schaal, positie op de grond) wordt automatisch berekend.
3. Pas `SWITCH_MS` aan voor de wisselsnelheid.

