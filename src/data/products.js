export const products = [
  { id: 'neo-safari', name: 'Neo-Safari 2026', price: 2.5, priceUnits: 25, creator: 'FashionXpress Studio', rarity: 'Limited', stock: 50, score: 62, image: '/images/collection1.jpg', description: 'Adaptive textures meet sculptural tailoring in a tribute to bold exploration.' },
  { id: 'quantum-lace', name: 'Quantum Lace', price: 1.8, priceUnits: 18, creator: 'FashionXpress Studio', rarity: 'Rare', stock: 12, score: 78, image: '/images/collection2.jpg', description: 'Interwoven algorithmic patterns shimmer in virtual light, designed for the high-end metaverse.' },
  { id: 'solaris-cloak', name: 'Solaris Cloak', price: 3.2, priceUnits: 32, creator: 'FashionXpress Studio', rarity: 'Ultra Rare', stock: 5, score: 95, image: '/images/collection3.jpg', description: 'Solar-cell fabric technology glows with the energy of the virtual sun.' },
  { id: 'quantum-silk', name: 'Quantum Silk', price: 2.8, priceUnits: 28, creator: 'FashionXpress Studio', rarity: 'Ultra Rare', stock: 2, score: 97, image: '/images/collection4.jpg', description: 'Reactive fabric shifts its glow with the rhythm of the digital marketplace.' },
  { id: 'net-xplora', name: 'Net-Xplora 1986', price: 4, priceUnits: 40, creator: 'FashionXpress Studio', rarity: 'Limited', stock: 75, score: 59, image: '/images/collection5.jpg', description: 'Retro-future drapery with adaptive textures for every virtual environment.' },
  { id: 'lavida-locale', name: 'Lavida Locale', price: 9, priceUnits: 90, creator: 'FashionXpress Studio', rarity: 'Rare', stock: 8, score: 84, image: '/images/collection6.jpg', description: 'Local craft codes become shimmering algorithmic patterns in virtual light.' },
  { id: 'ancestral-circuit', name: 'Ancestral Circuit', price: 3.8, priceUnits: 38, creator: 'FashionXpress Studio', rarity: 'Rare', stock: 20, score: 82, image: '/images/ancestral-circuit.jpg', description: 'Bronze circuitry traces woven memory across a sculptural coat shaped for ceremonial presence.' },
  { id: 'lagoon-protocol', name: 'Lagoon Protocol', price: 6.5, priceUnits: 65, creator: 'FashionXpress Studio', rarity: 'Ultra Rare', stock: 5, score: 94, image: '/images/lagoon-protocol.jpg', description: 'Luminous tidal forms gather into a fluid silhouette suspended between water and light.' },
  { id: 'harmattan-veil', name: 'Harmattan Veil', price: 2.9, priceUnits: 29, creator: 'FashionXpress Studio', rarity: 'Limited', stock: 30, score: 68, image: '/images/harmattan-veil.jpg', description: 'Sand-toned layers sweep through a veiled silhouette shaped by dry-season motion.' },
]

export const productById = Object.fromEntries(products.map((product) => [product.id, product]))

export function selectProducts({ filter = 'All', sort = 'featured', query = '' } = {}) {
  const term = query.trim().toLowerCase()
  const selected = products.filter((product) => (filter === 'All' || product.rarity === filter) && `${product.name} ${product.description}`.toLowerCase().includes(term))
  if (sort === 'low') return selected.sort((a, b) => a.priceUnits - b.priceUnits)
  if (sort === 'high') return selected.sort((a, b) => b.priceUnits - a.priceUnits)
  return selected
}
