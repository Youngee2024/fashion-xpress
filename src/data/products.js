export const products = [
  { id: 'neo-safari', name: 'Neo-Safari 2026', price: 2.5, rarity: 'Limited', stock: 50, score: 62, image: '/images/collection1.jpg', description: 'Adaptive textures meet sculptural tailoring in a tribute to bold exploration.' },
  { id: 'quantum-lace', name: 'Quantum Lace', price: 1.8, rarity: 'Rare', stock: 12, score: 78, image: '/images/collection2.jpg', description: 'Interwoven algorithmic patterns shimmer in virtual light, designed for the high-end metaverse.' },
  { id: 'solaris-cloak', name: 'Solaris Cloak', price: 3.2, rarity: 'Ultra Rare', stock: 5, score: 95, image: '/images/collection3.jpg', description: 'Solar-cell fabric technology glows with the energy of the virtual sun.' },
  { id: 'quantum-silk', name: 'Quantum Silk', price: 2.8, rarity: 'Ultra Rare', stock: 2, score: 97, image: '/images/collection4.jpg', description: 'Reactive fabric shifts its glow with the rhythm of the digital marketplace.' },
  { id: 'net-xplora', name: 'Net-Xplora 1986', price: 4, rarity: 'Limited', stock: 75, score: 59, image: '/images/collection5.jpg', description: 'Retro-future drapery with adaptive textures for every virtual environment.' },
  { id: 'lavida-locale', name: 'Lavida Locale', price: 9, rarity: 'Rare', stock: 8, score: 84, image: '/images/collection6.jpg', description: 'Local craft codes become shimmering algorithmic patterns in virtual light.' },
]

export const productById = Object.fromEntries(products.map((product) => [product.id, product]))
