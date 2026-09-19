import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getRouteMeta } from '../data/routeMeta'

function setMetaContent(selector, attributes, content) {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value))
    document.head.append(element)
  }
  element.setAttribute('content', content)
}

export function RouteMeta() {
  const { pathname } = useLocation()

  useEffect(() => {
    const meta = getRouteMeta(pathname)
    const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
    const canonicalUrl = new URL(normalizedPath, window.location.origin).href
    const socialImageUrl = new URL('/images/social-preview.jpg', window.location.origin).href
    document.title = meta.title

    setMetaContent('meta[name="description"]', { name: 'description' }, meta.description)
    setMetaContent('meta[property="og:title"]', { property: 'og:title' }, meta.title)
    setMetaContent('meta[property="og:description"]', { property: 'og:description' }, meta.description)
    setMetaContent('meta[property="og:url"]', { property: 'og:url' }, canonicalUrl)
    setMetaContent('meta[property="og:image"]', { property: 'og:image' }, socialImageUrl)
    setMetaContent('meta[name="twitter:title"]', { name: 'twitter:title' }, meta.title)
    setMetaContent('meta[name="twitter:description"]', { name: 'twitter:description' }, meta.description)
    setMetaContent('meta[name="twitter:image"]', { name: 'twitter:image' }, socialImageUrl)

    let canonical = document.head.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.append(canonical)
    }
    canonical.setAttribute('href', canonicalUrl)
  }, [pathname])

  return null
}
