// 3D-modellen in de hero. Nieuw model toevoegen: zie README ("3D-modellen").
// `rest` = beginhoek (rad) waarin het model staat voordat je scrolt; `sat` = kleurverzadiging en `bright` = helderheid
// (beide 1 = origineel).
// `size` = afmetingen [x, y, z] van het model (uit de preview), alleen om de camera vooraf te kunnen
// instellen voordat het model is geladen. De echte positie en schaal worden bij het laden berekend.
export const MODELS = [
  { id: 'smashburger', url: '/models/burger.glb', label: 'Smashburger', href: '#menu-smashburgers', size: [0.878, 0.435, 0.866], rest: 3.93, sat: 1.1, bright: 1.45 },
  { id: 'cheesefries', url: '/models/fries.glb', label: 'Cheesefries', href: '#menu-cheesefries', size: [1.903, 0.61, 1.218], rest: 0.6 },
  { id: 'le-crousty', url: '/models/le-crousty.glb', label: 'Le Crousty', href: '#menu-extra', size: [0.595, 0.261, 1], rest: 0.6 },
  { id: 'smashburger-cheesefries', url: '/models/smashburger-cheesefries.glb', label: 'Smashburger x Cheesefries', href: '#menu-smashburgers', size: [0.907, 0.3, 1], rest: 0.6 },
]

export const SATURATION = 1.3 // standaard kleurverzadiging (per model te overschrijven met `sat`)
export const SWITCH_MS = 7000 // tijd tussen automatisch wisselen
export const DIAMETER = 2.7 // elk model krijgt dezelfde "draaibreedte" (cirkel waar het in past)

// Hoogte van een model na het schalen naar DIAMETER
export const heightOf = (m) => (m.size[1] * DIAMETER) / Math.hypot(m.size[0], m.size[2])
