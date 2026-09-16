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
  '/auth': { title: 'Community Sign-In | FashionXpress', description: 'Enter the portfolio demo or sign in with a six-digit email code in configured Live Mode.' },
  '/auth/verify': { title: 'Verify Email Code | FashionXpress', description: 'Verify your six-digit FashionXpress Community email code securely.' },
  '/profile/setup': { title: 'Set Up Profile | FashionXpress', description: 'Choose a handle and a public FashionXpress Community profile.' },
  '/profile/edit': { title: 'Edit Profile | FashionXpress', description: 'Edit your public FashionXpress Community profile and account settings.' },
  '/community-guidelines': { title: 'Community Guidelines | FashionXpress', description: 'Read FashionXpress Community conduct, reporting, and moderation limitations.' },
  '/about': { title: 'About FashionXpress', description: 'Discover how FashionXpress connects African creativity, digital craft, and global culture.' },
  '/contact': { title: 'Contact | FashionXpress', description: 'Find direct contact details for FashionXpress partnerships, collecting, press, and creator support.' },
  '/get-started': { title: 'Creator Atelier | FashionXpress', description: 'Learn how independent digital fashion creators can work with FashionXpress.' },
  '/privacy': { title: 'Privacy | FashionXpress', description: 'Understand what the FashionXpress portfolio prototype stores locally and what information it never transmits.' },
  '/terms': { title: 'Prototype Terms | FashionXpress', description: 'Read the demonstration terms for exploring the non-commercial FashionXpress portfolio prototype.' },
  '/licensing': { title: 'Digital Fashion Licensing | FashionXpress', description: 'Explore how a future FashionXpress service would explain creator rights and digital garment licenses.' },
  '/refund-policy': { title: 'Purchase Status | FashionXpress', description: 'Learn why purchases and refunds are unavailable in the non-transactional FashionXpress prototype.' },
  '/accessibility': { title: 'Accessibility | FashionXpress', description: 'Review current accessibility support and known testing limits for the FashionXpress portfolio prototype.' },
  '/newsletter/confirm': { title: 'Confirm Newsletter | FashionXpress', description: 'Securely confirm your consent to receive FashionXpress collection and creator newsletter updates.' },
  '/newsletter/unsubscribe': { title: 'Unsubscribe | FashionXpress', description: 'Securely update your FashionXpress newsletter preference and stop future newsletter email.' },
}

export function getRouteMeta(pathname) {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (/^\/community\/[^/]+$/.test(normalizedPath)) return { title: 'Community Discussion | FashionXpress', description: 'Read and reply to a FashionXpress digital-fashion discussion.' }
  if (/^\/profile\/[^/]+$/.test(normalizedPath) && !ROUTE_META[normalizedPath]) return { title: 'Community Profile | FashionXpress', description: 'View a FashionXpress Community member profile and public activity.' }
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
