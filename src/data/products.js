export const products = [
  { id: 'neo-safari', name: 'Neo-Safari 2026', currency: 'NGN', priceKobo: 8500000, collectiblePriceEth: 2.5, collectiblePriceUnits: 25, creator: 'FashionXpress Studio', rarity: 'Limited', stock: 50, score: 62, image: '/images/collection1.jpg', description: 'Adaptive textures meet sculptural tailoring in a tribute to bold exploration.' },
  { id: 'quantum-lace', name: 'Quantum Lace', currency: 'NGN', priceKobo: 6000000, collectiblePriceEth: 1.8, collectiblePriceUnits: 18, creator: 'FashionXpress Studio', rarity: 'Rare', stock: 12, score: 78, image: '/images/collection2.jpg', description: 'Interwoven algorithmic patterns shimmer in virtual light, designed for the high-end metaverse.' },
  { id: 'solaris-cloak', name: 'Solaris Cloak', currency: 'NGN', priceKobo: 12000000, collectiblePriceEth: 3.2, collectiblePriceUnits: 32, creator: 'FashionXpress Studio', rarity: 'Ultra Rare', stock: 5, score: 95, image: '/images/collection3.jpg', description: 'Solar-cell fabric technology glows with the energy of the virtual sun.' },
  { id: 'quantum-silk', name: 'Quantum Silk', currency: 'NGN', priceKobo: 10000000, collectiblePriceEth: 2.8, collectiblePriceUnits: 28, creator: 'FashionXpress Studio', rarity: 'Ultra Rare', stock: 2, score: 97, image: '/images/collection4.jpg', description: 'Reactive fabric shifts its glow with the rhythm of the digital marketplace.' },
  { id: 'net-xplora', name: 'Net-Xplora 1986', currency: 'NGN', priceKobo: 15500000, collectiblePriceEth: 4, collectiblePriceUnits: 40, creator: 'FashionXpress Studio', rarity: 'Limited', stock: 75, score: 59, image: '/images/collection5.jpg', description: 'Retro-future drapery with adaptive textures for every virtual environment.' },
  { id: 'lavida-locale', name: 'Lavida Locale', currency: 'NGN', priceKobo: 25000000, collectiblePriceEth: 9, collectiblePriceUnits: 90, creator: 'FashionXpress Studio', rarity: 'Rare', stock: 8, score: 84, image: '/images/collection6.jpg', description: 'Local craft codes become shimmering algorithmic patterns in virtual light.' },
  { id: 'ancestral-circuit', name: 'Ancestral Circuit', currency: 'NGN', priceKobo: 14500000, collectiblePriceEth: 3.8, collectiblePriceUnits: 38, creator: 'FashionXpress Studio', rarity: 'Rare', stock: 20, score: 82, image: '/images/ancestral-circuit.jpg', description: 'Bronze circuitry traces woven memory across a sculptural coat shaped for ceremonial presence.' },
  { id: 'lagoon-protocol', name: 'Lagoon Protocol', currency: 'NGN', priceKobo: 19500000, collectiblePriceEth: 6.5, collectiblePriceUnits: 65, creator: 'FashionXpress Studio', rarity: 'Ultra Rare', stock: 5, score: 94, image: '/images/lagoon-protocol.jpg', description: 'Luminous tidal forms gather into a fluid silhouette suspended between water and light.' },
  { id: 'harmattan-veil', name: 'Harmattan Veil', currency: 'NGN', priceKobo: 10500000, collectiblePriceEth: 2.9, collectiblePriceUnits: 29, creator: 'FashionXpress Studio', rarity: 'Limited', stock: 30, score: 68, image: '/images/harmattan-veil.jpg', description: 'Sand-toned layers sweep through a veiled silhouette shaped by dry-season motion.' },
]

export const productById = Object.fromEntries(products.map((product) => [product.id, product]))

export function selectProducts({ filter = 'All', sort = 'featured', query = '' } = {}) {
  const term = query.trim().toLowerCase()
  const selected = products.filter((product) => (filter === 'All' || product.rarity === filter) && `${product.name} ${product.description}`.toLowerCase().includes(term))
  if (sort === 'low') return selected.sort((a, b) => a.priceKobo - b.priceKobo)
  if (sort === 'high') return selected.sort((a, b) => b.priceKobo - a.priceKobo)
  return selected
}
