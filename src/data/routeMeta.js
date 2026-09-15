import { productById } from './products.js'

const DEFAULT_META = {
  title: 'FashionXpress — Digital Fashion, Reimagined',
  description: 'FashionXpress brings African digital fashion, limited-edition wearables, and creator culture to a global audience.',
}

const ROUTE_META = {
  '/': DEFAULT_META,
  '/collections': { title: 'Genesis Collection | FashionXpress', description: 'Explore limited-edition digital garments from the FashionXpress Genesis collection.' },
  '/ar-tryon': { title: 'Camera Preview | FashionXpress', description: 'Preview the experimental FashionXpress camera atelier and explore digital looks.' },
  '/community': { title: 'Creator Community | FashionXpress', description: 'Join conversations with digital fashion designers, collectors, and creative technologists.' },
  '/about': { title: 'About FashionXpress', description: 'Discover how FashionXpress connects African creativity, digital craft, and global culture.' },
  '/contact': { title: 'Contact | FashionXpress', description: 'Find direct contact details for FashionXpress partnerships, collecting, press, and creator support.' },
  '/get-started': { title: 'Creator Atelier | FashionXpress', description: 'Learn how independent digital fashion creators can work with FashionXpress.' },
  '/privacy': { title: 'Privacy | FashionXpress', description: 'Understand what the FashionXpress portfolio prototype stores locally and what information it never transmits.' },
  '/terms': { title: 'Prototype Terms | FashionXpress', description: 'Read the demonstration terms for exploring the non-commercial FashionXpress portfolio prototype.' },
  '/licensing': { title: 'Digital Fashion Licensing | FashionXpress', description: 'Explore how a future FashionXpress service would explain creator rights and digital garment licenses.' },
  '/refund-policy': { title: 'Purchase Status | FashionXpress', description: 'Learn why purchases and refunds are unavailable in the non-transactional FashionXpress prototype.' },
  '/accessibility': { title: 'Accessibility | FashionXpress', description: 'Review current accessibility support and known testing limits for the FashionXpress portfolio prototype.' },
}

export function getRouteMeta(pathname) {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  const productMatch = normalizedPath.match(/^\/collections\/([^/]+)$/)
  if (productMatch) {
    const product = productById[productMatch[1]]
    return product ? {
      title: `${product.name} | FashionXpress`,
      description: `${product.description} Explore this ${product.rarity.toLowerCase()} digital fashion edition.`,
    } : ROUTE_META['/collections']
  }

  const mintMatch = normalizedPath.match(/^\/mint\/([^/]+)$/)
  if (mintMatch) {
    const product = productById[mintMatch[1]]
    return {
      title: `${product?.name ?? 'Mint'} Prototype | FashionXpress`,
      description: 'Review the non-transactional FashionXpress mint interface prototype.',
    }
  }

  return ROUTE_META[normalizedPath] ?? {
    title: 'Page Not Found | FashionXpress',
    description: 'The requested FashionXpress page could not be found.',
  }
}
