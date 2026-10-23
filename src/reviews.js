// Echte reviews hier plaatsen (kopieer ze van Google). Zolang de lijst leeg is, toont de
// sectie alleen de knop om een review achter te laten.
// Vorm: { name: 'Voornaam A.', rating: 5, text: '...', when: 'oktober 2026',
//         image: '/reviews/review-1.jpg', imageAlt: 'Beschrijving van de foto' }  (image is optioneel)
// Foto's staan in public/reviews/.
// DUMMY-REVIEWS: tijdelijk, vervang door echte reviews (en vraag toestemming voor naam en foto).
export const reviews = [
  {
    name: 'Amine El.', rating: 5, when: 'oktober 2026',
    text: 'Crispy tenders en tropical chicken geprobeerd, allebei super lekker. Veel cheddar en knapperige kip, en de verse lenteui maakt het af.',
    image: '/reviews/review-1.jpg', imageAlt: 'Twee bakjes cheesefries met crispy chicken en pulled chicken',
  },
  {
    name: 'Sara R.', rating: 5, when: 'oktober 2026',
    text: 'Heel knapperige kip met een flinke laag topping erop. Het bakje zat vol en alles was nog warm toen het aankwam.',
    image: '/reviews/review-3.jpg', imageAlt: 'Bakje met crispy chicken en gebakken uitjes',
  },
  {
    name: 'Jens D.', rating: 4, when: 'oktober 2026',
    text: 'Zwaar gevuld bakje met veel cheddar en vlees. Grote portie voor de prijs, ik kom zeker terug.',
    image: '/reviews/review-2.jpg', imageAlt: 'Bakje cheesefries met vlees, cheddar en gebakken uitjes',
  },
]
