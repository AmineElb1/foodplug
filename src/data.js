// Menu volgens de Uber Eats-pagina van Foodplug. Beschrijvingen staan alleen in de detailweergave.
export const categories = [
  { id: 'cheesefries', label: 'Cheesefries' },
  { id: 'smashburgers', label: 'Smashburgers' },
  { id: 'extra', label: 'Rijst & extra' },
  { id: 'drinks', label: 'Drankjes' },
  { id: 'dessert', label: 'Dessert' },
]

const photo = (id) => `/menu/${id}.jpg`

const DRINKS = {
  label: 'Kies je drankje',
  hint: 'Inbegrepen',
  choices: [
    { id: 'cola', label: 'Coca-Cola' },
    { id: 'spa', label: 'Spa Water' },
    { id: 'fanta', label: 'Fanta Exotic' },
  ],
}

export const products = [
  { id: 'cheesefries-tropical', cat: 'cheesefries', name: 'Cheesefries Tropical Marinated Chicken', price: 13.9, image: photo('cheesefries-tropical'),
    desc: 'Knapperige frietjes met gesmolten cheddar, mozzarella, tropische kipkruiden, malse stukjes tropische kip, onze zelfgemaakte witte saus en een topping van verse peterselie.' },
  { id: 'cheesefries-crispy', cat: 'cheesefries', name: 'Cheesefries Crispy Tenders', price: 13.9, image: photo('cheesefries-crispy'), featured: true,
    desc: 'Knapperige frietjes met gesmolten cheddar, cajun kruiden, krokante kipreepjes, onze zelfgemaakte saus en een topping van verse lente-ui.' },
  { id: 'cheesefries-mix', cat: 'cheesefries', name: 'Cheesefries Mix', price: 14.9, badge: 'Best seller', image: photo('cheesefries-mix'),
    desc: 'Knapperige frietjes met gesmolten cheddar, onze speciale kruiden, half tropical en half krokante tenders, onze zelfgemaakte saus en een topping van verse lente-ui.' },
  { id: 'cheesefries-smashed-beef', cat: 'cheesefries', name: 'Cheesefries Smashed Beef', price: 13.9, image: photo('cheesefries-smashed-beef'),
    desc: 'Knapperige frietjes met gesmolten cheddar, satékruiden, gesmasht beef, onze huisgemaakte saus en een topping van krokante uitjes.' },

  { id: 'smashburger', cat: 'smashburgers', name: 'Smashburger', price: 8.5, image: photo('smashburger'),
    desc: 'Gesmasht beef, verse uien, rijkelijk gesmolten cheddar, verse sla en onze romige saus. Alles tussen een goudbruin geroosterde brioche bun met boter.' },
  { id: 'double-smashburger', cat: 'smashburgers', name: 'Double Smashburger', price: 10.5, image: photo('double-smashburger'), featured: true,
    desc: 'Double gesmasht beef, verse uien, rijkelijk gesmolten cheddar, verse sla en onze romige saus. Alles tussen een goudbruin geroosterde brioche bun met boter.' },
  { id: 'smashburger-cheesefries', cat: 'smashburgers', name: 'Smashburger x Cheesefries', price: 19.9, badge: 'Best seller', image: photo('smashburger-cheesefries'), featured: true, options: DRINKS,
    desc: 'Met een gratis drank. Gesmasht beef, verse uien, rijkelijk gesmolten cheddar, knapperige sla en onze romige huisgemaakte saus. Allemaal tussen een goudbruin geroosterde brioche bun met boter. Geserveerd met knapperige frietjes met gesmolten cheddar, cajun kruiden, krokante kipreepjes, onze huisgemaakte saus en een topping van verse lente-ui.' },

  { id: 'le-crousty', cat: 'extra', name: 'Le Crousty', price: 12.9, image: photo('le-crousty'),
    desc: 'Basmatirijst, huisgemaakte witte saus, crispy tenders, sweet chili en krokante uitjes.' },

  { id: 'chicken-wings', cat: 'extra', name: 'Chicken Wings', meta: '4 stuks', price: 6.9, image: photo('chicken-wings'), featured: true },

  { id: 'cola', cat: 'drinks', name: 'Coca-Cola', meta: '33 cl', price: 2.9, image: photo('cola') },
  { id: 'spa', cat: 'drinks', name: 'Spa Water', price: 2.5, image: photo('spa') },
  { id: 'fanta', cat: 'drinks', name: 'Fanta Exotic', meta: '33 cl', price: 2.9, image: photo('fanta') },

  { id: 'vanille-milkshake', cat: 'dessert', name: 'Vanille Milkshake', price: 5.5, image: photo('vanille-milkshake'), desc: 'Romige milkshake met vanille.' },
]

export const productById = Object.fromEntries(products.map((p) => [p.id, p]))
