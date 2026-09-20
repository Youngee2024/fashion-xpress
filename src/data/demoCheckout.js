import { productById, products } from './products.js'

export const CHECKOUT_DRAFT_KEY = 'fashionxpress.demoCheckout.v1'
export const DEMO_COLLECTION_KEY = 'fashionxpress.demoCollection.v1'
export const CHECKOUT_STEPS = ['bag', 'ownership', 'licence', 'payment', 'review']
export const DEMO_OWNERS = [
  { id: 'runway-guest', label: 'Runway Guest', description: 'The fictional Demo Community identity.' },
  { id: 'guest-collector', label: 'Guest Collector', description: 'A fictional collector identity; no account or contact details.' },
]
export const CONCEPT_LICENCES = [
  { id: 'personal', label: 'Personal digital use', adjustmentPercent: 0, description: 'A concept for private styling and personal display.' },
  { id: 'social', label: 'Social and content use', adjustmentPercent: 20, description: 'A concept for sharing styled images and non-commercial content.' },
  { id: 'extended', label: 'Extended creator use', adjustmentPercent: 50, description: 'A concept for broader creator projects; no rights are actually granted.' },
]
const licenceById = Object.fromEntries(CONCEPT_LICENCES.map((licence) => [licence.id, licence]))
const ownerIds = new Set(DEMO_OWNERS.map((owner) => owner.id))
const tokenPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i

export function formatConceptUnits(units) {
  if (!Number.isSafeInteger(units) || units < 0) throw new Error('Invalid concept amount.')
  return `${Math.floor(units / 10)}.${units % 10} concept ETH`
}

export function validDemoItems(items) {
  return Array.isArray(items) && items.length > 0 && items.length <= products.length && items.every((item) => productById[item?.id] && Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 99 && licenceById[item.licence]) && new Set(items.map((item) => item.id)).size === items.length
}

export function cartSnapshot(cart) {
  return cart.map(({ product, quantity }) => ({ id: product.id, quantity }))
}

export function cartSignature(cart) {
  return cartSnapshot(cart).sort((a, b) => a.id.localeCompare(b.id)).map(({ id, quantity }) => `${id}:${quantity}`).join('|')
}

export function calculateDemoTotal(items) {
  if (!validDemoItems(items)) throw new Error('Invalid demo checkout items.')
  const lines = items.map(({ id, quantity, licence }) => {
    const product = productById[id]
    const adjustmentPerItem = Math.floor((product.priceUnits * licenceById[licence].adjustmentPercent + 50) / 100)
    return { product, quantity, licence: licenceById[licence], baseUnits: product.priceUnits * quantity, adjustmentUnits: adjustmentPerItem * quantity, lineUnits: (product.priceUnits + adjustmentPerItem) * quantity }
  })
  const subtotalUnits = lines.reduce((sum, line) => sum + line.baseUnits, 0)
  const adjustmentUnits = lines.reduce((sum, line) => sum + line.adjustmentUnits, 0)
  return { lines, subtotalUnits, adjustmentUnits, totalUnits: subtotalUnits + adjustmentUnits }
}

export function selectionsFromCart(cart, licences = {}) {
  return cartSnapshot(cart).map((item) => ({ ...item, licence: licenceById[licences[item.id]] ? licences[item.id] : 'personal' }))
}

function storageOrDefault(storage) { return storage ?? globalThis.sessionStorage }
function newToken() { return globalThis.crypto.randomUUID() }

export function freshCheckoutDraft(cart, token = newToken(), owner = 'guest-collector') {
  return { token, signature: cartSignature(cart), owner: ownerIds.has(owner) ? owner : 'guest-collector', licences: {}, highestStep: 0 }
}

export function readCheckoutDraft(cart, storage, preferredOwner = 'guest-collector') {
  try {
    const target = storageOrDefault(storage)
    const raw = target?.getItem(CHECKOUT_DRAFT_KEY)
    const value = raw ? JSON.parse(raw) : null
    const productIds = new Set(cart.map(({ product }) => product.id))
    if (value && typeof value.token === 'string' && tokenPattern.test(value.token) && value.signature === cartSignature(cart) && ownerIds.has(value.owner) && Number.isInteger(value.highestStep) && value.highestStep >= 0 && value.highestStep < CHECKOUT_STEPS.length && value.licences && typeof value.licences === 'object' && !Array.isArray(value.licences) && Object.entries(value.licences).every(([id, licence]) => productIds.has(id) && licenceById[licence])) return value
    if (raw) target?.removeItem(CHECKOUT_DRAFT_KEY)
  } catch { /* Corrupt or unavailable session storage starts a safe new draft. */ }
  return freshCheckoutDraft(cart, newToken(), preferredOwner)
}

export function writeCheckoutDraft(draft, storage) {
  try { const target = storageOrDefault(storage); if (!target) return false; target.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft)); return true } catch { return false }
}

export function clearCheckoutDraft(storage) {
  try { storageOrDefault(storage)?.removeItem(CHECKOUT_DRAFT_KEY) } catch { /* Session storage may be unavailable. */ }
}

export function readDemoCollection(storage) {
  try {
    const target = storageOrDefault(storage)
    const raw = target?.getItem(DEMO_COLLECTION_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length > 10 || !parsed.every((receipt) => typeof receipt?.token === 'string' && tokenPattern.test(receipt.token) && receipt.reference === `FX-DEMO-${receipt.token.replaceAll('-', '').slice(0, 8).toUpperCase()}` && !Number.isNaN(Date.parse(receipt.completedAt)) && ownerIds.has(receipt.owner) && validDemoItems(receipt.items))) throw new Error('Invalid demo collection')
    return parsed
  } catch {
    try { storageOrDefault(storage)?.removeItem(DEMO_COLLECTION_KEY) } catch { /* Safe empty fallback. */ }
    return []
  }
}

export function resetDemoCollection(storage) {
  try { storageOrDefault(storage)?.removeItem(DEMO_COLLECTION_KEY) } catch { /* The UI will still show the empty fallback. */ }
}

export function removeCompletedFromCart(cart, items) {
  const quantities = new Map(items.filter((item) => productById[item?.id] && Number.isInteger(item.quantity) && item.quantity > 0).map((item) => [item.id, item.quantity]))
  return cart.flatMap((entry) => {
    const remaining = entry.quantity - (quantities.get(entry.product.id) ?? 0)
    return remaining > 0 ? [{ ...entry, quantity: remaining }] : []
  })
}

export function completeDemoCheckout(cart, draft, storage, completedAt = new Date().toISOString()) {
  if (!cart.length || !tokenPattern.test(draft.token) || draft.signature !== cartSignature(cart) || draft.highestStep < 4 || !ownerIds.has(draft.owner)) throw new Error('Complete the earlier checkout steps first.')
  const items = selectionsFromCart(cart, draft.licences)
  calculateDemoTotal(items)
  const existing = readDemoCollection(storage)
  const previous = existing.find((receipt) => receipt.token === draft.token)
  if (previous) return previous
  const receipt = { token: draft.token, reference: `FX-DEMO-${draft.token.replaceAll('-', '').slice(0, 8).toUpperCase()}`, completedAt, owner: draft.owner, items }
  try { const target = storageOrDefault(storage); if (!target) throw new Error('No session storage'); target.setItem(DEMO_COLLECTION_KEY, JSON.stringify([...existing, receipt].slice(-10))); return receipt }
  catch { throw new Error('Demo collection storage is unavailable. Your bag has not been cleared.') }
}
