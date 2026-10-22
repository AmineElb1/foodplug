export const categories = [
  { id: 'burgers', label: 'BURGERS', tone: 'red' },
  { id: 'cheesefries', label: 'CHEESEFRIES', tone: 'gold' },
  { id: 'dessert', label: 'DESSERT', tone: 'light' },
]

const FRIES = 'Knapperige frietjes met gesmolten cheddar'
const SAUCE = 'onze zelfgemaakte saus en een topping van verse lenteui'
const BUN = 'goudbruin geroosterde brioche bun met boter'

export const products = [
  { id: 'smashburger', cat: 'burgers', name: 'Smashburger', price: 8.5, oldPrice: 10,
    desc: `Gesmasht beef, verse uien, rijkelijk gesmolten cheddar, verse sla en onze romige saus, alles tussen een ${BUN}.` },
  { id: 'double-smashburger', cat: 'burgers', name: 'Double Smashburger', price: 10.5, oldPrice: 12,
    desc: `Double gesmasht beef, verse uien, rijkelijk gesmolten cheddar, verse sla en onze romige saus, alles tussen een ${BUN}.` },
  { id: 'smashburger-cheesefries', cat: 'burgers', name: 'Smashburger x Cheesefries', badge: 'Best seller', price: 17.9, oldPrice: 20,
    desc: `Gesmasht beef, verse uien, cheddar, knapperige sla en onze romige huisgemaakte saus in een ${BUN}. Geserveerd met cheesefries, cajun kruiden en crispy chicken tenders. Inclusief gratis drank.` },

  { id: 'cheesefries-tropical', cat: 'cheesefries', name: 'Cheesefries Tropical Marinated Chicken', price: 13.9, oldPrice: 15,
    desc: `${FRIES}, tropical chicken seasoning, malse stukjes pulled chicken, ${SAUCE}.` },
  { id: 'cheesefries-crispy', cat: 'cheesefries', name: 'Cheesefries Crispy Tenders', price: 13.9, oldPrice: 15,
    desc: `${FRIES}, cajun kruiden, crispy chicken tenders, ${SAUCE}.` },
  { id: 'cheesefries-mix', cat: 'cheesefries', name: 'Cheesefries Mix', badge: 'Best seller', price: 14.9, oldPrice: 16,
    desc: `${FRIES}, onze speciale kruiden, half tropical en half crispy tenders, ${SAUCE}.` },

  { id: 'vanille-milkshake', cat: 'dessert', name: 'Vanille Milkshake', desc: 'Romige milkshake met vanille.', price: 5.5 },
]
