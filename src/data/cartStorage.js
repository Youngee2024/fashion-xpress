import { productById } from './products.js'

export const CART_STORAGE_KEY = 'fashionxpress.cart.v1'

export function normalizeCart(value) {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value
  if (!Array.isArray(parsed)) return []

  const quantities = new Map()
  for (const entry of parsed) {
    const id = typeof entry?.id === 'string' ? entry.id : entry?.product?.id
    if (!productById[id]) continue
    const quantity = Number.isInteger(entry.quantity) ? entry.quantity : 1
    if (quantity < 1) continue
    quantities.set(id, Math.min(99, (quantities.get(id) ?? 0) + quantity))
  }

  return [...quantities].map(([id, quantity]) => ({ product: productById[id], quantity }))
}

export function readCart(storage) {
  try {
    const target = storage ?? globalThis.localStorage
    const stored = target?.getItem(CART_STORAGE_KEY)
    return stored ? normalizeCart(stored) : []
  } catch {
    try { (storage ?? globalThis.localStorage)?.removeItem(CART_STORAGE_KEY) } catch { /* Storage may be unavailable. */ }
    return []
  }
}

export function writeCart(entries, storage) {
  try {
    const target = storage ?? globalThis.localStorage
    target?.setItem(CART_STORAGE_KEY, JSON.stringify(entries.map(({ product, quantity }) => ({ id: product.id, quantity }))))
    return true
  } catch {
    return false
  }
}
