import { calculateLicenceUpliftKobo, isValidKobo } from './commercePricing.js'
import { productById, products } from './products.js'

export const RECEIPT_SCHEMA_VERSION = 2
export const CHECKOUT_DRAFT_KEY = 'fashionxpress.demoCheckout.v1'
export const DEMO_COLLECTION_KEY = 'fashionxpress.demoCollection.v2'
export const LEGACY_DEMO_COLLECTION_KEY = 'fashionxpress.demoCollection.v1'
export const LEGACY_COLLECTION_NOTICE_KEY = 'fashionxpress.demoCollectionLegacyCleared.v1'
export const CHECKOUT_STEPS = ['bag', 'licence', 'ownership', 'payment', 'review']
export const DEMO_CUSTOMERS = [
  { id: 'runway-guest', label: 'Runway Guest', description: 'The fictional Demo Community profile.' },
  { id: 'guest-customer', label: 'Studio Guest', description: 'A fictional customer profile; no account or contact details.' },
]
export const DIGITAL_USE_LICENCES = [
  { id: 'personal', label: 'Personal-use licence', adjustmentPercent: 0, description: 'Base price for personal digital expression.', permissions: ['Personal digital styling', 'Private Virtual Try-On use', 'Personal device and profile use', 'No commercial use', 'No resale or ownership transfer'] },
  { id: 'social', label: 'Creator/content licence', adjustmentPercent: 20, description: 'Base price plus 20% for creator and content use.', permissions: ['Personal-use permissions', 'Social-media and editorial content', 'Creator portfolio use', 'Monetized personal content where allowed by the final agreement', 'No resale or transfer'] },
  { id: 'extended', label: 'Commercial/extended licence', adjustmentPercent: 50, description: 'Base price plus 50% for an extended commercial-use concept.', permissions: ['Personal and creator permissions', 'Commercial campaign or brand-content concept', 'Broader usage subject to the final licence agreement', 'No copyright transfer', 'No resale unless separately agreed'] },
]

// Compatibility export for the separate collectible simulation until it is repositioned.
export const CONCEPT_LICENCES = DIGITAL_USE_LICENCES

const licenceById = Object.fromEntries(DIGITAL_USE_LICENCES.map((licence) => [licence.id, licence]))
const customerIds = new Set(DEMO_CUSTOMERS.map((customer) => customer.id))
const tokenPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i

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
  const lines = items.map(({ id, quantity, licence: licenceId }) => {
    const product = productById[id]
    const licence = licenceById[licenceId]
    const upliftPerItemKobo = calculateLicenceUpliftKobo(product.priceKobo, licence.adjustmentPercent)
    const licensedUnitPriceKobo = product.priceKobo + upliftPerItemKobo
    return {
      product,
      quantity,
      licence,
      baseUnitPriceKobo: product.priceKobo,
      upliftPerItemKobo,
      licensedUnitPriceKobo,
      baseLineKobo: product.priceKobo * quantity,
      adjustmentKobo: upliftPerItemKobo * quantity,
      lineTotalKobo: licensedUnitPriceKobo * quantity,
    }
  })
  const subtotalKobo = lines.reduce((sum, line) => sum + line.baseLineKobo, 0)
  const adjustmentKobo = lines.reduce((sum, line) => sum + line.adjustmentKobo, 0)
  return { lines, subtotalKobo, adjustmentKobo, totalKobo: subtotalKobo + adjustmentKobo }
}

export function selectionsFromCart(cart, licences = {}) {
  return cartSnapshot(cart).map((item) => ({ ...item, licence: licenceById[licences[item.id]] ? licences[item.id] : 'personal' }))
}

function storageOrDefault(storage) { return storage ?? globalThis.sessionStorage }
function newToken() { return globalThis.crypto.randomUUID() }
function referenceFromToken(token) { return `FX-DEMO-${token.replaceAll('-', '').slice(0, 8).toUpperCase()}` }

export function freshCheckoutDraft(cart, token = newToken(), customer = 'guest-customer') {
  return { token, signature: cartSignature(cart), owner: customerIds.has(customer) ? customer : 'guest-customer', licences: {}, highestStep: 0 }
}

export function readCheckoutDraft(cart, storage, preferredCustomer = 'guest-customer') {
  try {
    const target = storageOrDefault(storage)
    const raw = target?.getItem(CHECKOUT_DRAFT_KEY)
    const value = raw ? JSON.parse(raw) : null
    const productIds = new Set(cart.map(({ product }) => product.id))
    if (value && typeof value.token === 'string' && tokenPattern.test(value.token) && value.signature === cartSignature(cart) && customerIds.has(value.owner) && Number.isInteger(value.highestStep) && value.highestStep >= 0 && value.highestStep < CHECKOUT_STEPS.length && value.licences && typeof value.licences === 'object' && !Array.isArray(value.licences) && Object.entries(value.licences).every(([id, licence]) => productIds.has(id) && licenceById[licence])) return value
    if (raw) target?.removeItem(CHECKOUT_DRAFT_KEY)
  } catch { /* Corrupt or unavailable session storage starts a safe new draft. */ }
  return freshCheckoutDraft(cart, newToken(), preferredCustomer)
}

export function writeCheckoutDraft(draft, storage) {
  try { const target = storageOrDefault(storage); if (!target) return false; target.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft)); return true } catch { return false }
}

export function clearCheckoutDraft(storage) {
  try { storageOrDefault(storage)?.removeItem(CHECKOUT_DRAFT_KEY) } catch { /* Session storage may be unavailable. */ }
}

function validReceiptLine(item, receipt) {
  const licence = licenceById[item?.licenceId]
  return item?.schemaVersion === RECEIPT_SCHEMA_VERSION
    && item.currency === 'NGN'
    && productById[item.productId]
    && typeof item.productTitle === 'string' && item.productTitle.length > 0 && item.productTitle.length <= 120
    && Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 99
    && licence && item.licenceLabel === licence.label && item.licenceUpliftPercent === licence.adjustmentPercent
    && isValidKobo(item.baseUnitPriceKobo) && item.baseUnitPriceKobo > 0
    && item.licensedUnitPriceKobo === item.baseUnitPriceKobo + calculateLicenceUpliftKobo(item.baseUnitPriceKobo, item.licenceUpliftPercent)
    && item.lineTotalKobo === item.licensedUnitPriceKobo * item.quantity
    && item.orderTotalKobo === receipt.totalKobo
    && item.orderReference === receipt.reference
    && item.completedAt === receipt.completedAt
}

function validReceipt(receipt) {
  if (receipt?.schemaVersion !== RECEIPT_SCHEMA_VERSION || receipt.currency !== 'NGN' || !tokenPattern.test(receipt.token) || receipt.reference !== referenceFromToken(receipt.token) || Number.isNaN(Date.parse(receipt.completedAt)) || !customerIds.has(receipt.customerProfile) || !Array.isArray(receipt.items) || receipt.items.length < 1 || receipt.items.length > products.length || !isValidKobo(receipt.totalKobo) || receipt.totalKobo <= 0) return false
  return receipt.items.every((item) => validReceiptLine(item, receipt))
    && new Set(receipt.items.map((item) => item.productId)).size === receipt.items.length
    && receipt.items.reduce((sum, item) => sum + item.lineTotalKobo, 0) === receipt.totalKobo
}

function markLegacyCollectionCleared(target) {
  try { target?.setItem(LEGACY_COLLECTION_NOTICE_KEY, '1') } catch { /* The collection can still recover safely. */ }
}

export function readDemoCollection(storage) {
  const target = storageOrDefault(storage)
  try {
    const legacyRaw = target?.getItem(LEGACY_DEMO_COLLECTION_KEY)
    if (legacyRaw) {
      target?.removeItem(LEGACY_DEMO_COLLECTION_KEY)
      markLegacyCollectionCleared(target)
    }
    const raw = target?.getItem(DEMO_COLLECTION_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length > 10 || !parsed.every(validReceipt)) {
      if (Array.isArray(parsed) && parsed.some((receipt) => receipt?.schemaVersion !== RECEIPT_SCHEMA_VERSION || receipt?.currency !== 'NGN')) markLegacyCollectionCleared(target)
      throw new Error('Invalid demo collection')
    }
    return parsed
  } catch {
    try { target?.removeItem(DEMO_COLLECTION_KEY) } catch { /* Safe empty fallback. */ }
    return []
  }
}

export function consumeLegacyCollectionNotice(storage) {
  try {
    const target = storageOrDefault(storage)
    const present = target?.getItem(LEGACY_COLLECTION_NOTICE_KEY) === '1'
    if (present) target?.removeItem(LEGACY_COLLECTION_NOTICE_KEY)
    return present
  } catch { return false }
}

export function resetDemoCollection(storage) {
  try {
    const target = storageOrDefault(storage)
    target?.removeItem(DEMO_COLLECTION_KEY)
    target?.removeItem(LEGACY_DEMO_COLLECTION_KEY)
    target?.removeItem(LEGACY_COLLECTION_NOTICE_KEY)
  } catch { /* The UI will still show the empty fallback. */ }
}

export function receiptSummary(receipt) {
  if (!validReceipt(receipt)) throw new Error('Invalid demo order receipt.')
  const lines = receipt.items.map((item) => ({
    product: productById[item.productId],
    productTitle: item.productTitle,
    quantity: item.quantity,
    licence: { id: item.licenceId, label: item.licenceLabel, adjustmentPercent: item.licenceUpliftPercent },
    baseUnitPriceKobo: item.baseUnitPriceKobo,
    upliftPerItemKobo: item.licensedUnitPriceKobo - item.baseUnitPriceKobo,
    licensedUnitPriceKobo: item.licensedUnitPriceKobo,
    baseLineKobo: item.baseUnitPriceKobo * item.quantity,
    adjustmentKobo: (item.licensedUnitPriceKobo - item.baseUnitPriceKobo) * item.quantity,
    lineTotalKobo: item.lineTotalKobo,
  }))
  return {
    lines,
    subtotalKobo: lines.reduce((sum, line) => sum + line.baseLineKobo, 0),
    adjustmentKobo: lines.reduce((sum, line) => sum + line.adjustmentKobo, 0),
    totalKobo: receipt.totalKobo,
  }
}

export function removeCompletedFromCart(cart, items) {
  const quantities = new Map(items.flatMap((item) => {
    const id = item?.productId ?? item?.id
    return productById[id] && Number.isInteger(item.quantity) && item.quantity > 0 ? [[id, item.quantity]] : []
  }))
  return cart.flatMap((entry) => {
    const remaining = entry.quantity - (quantities.get(entry.product.id) ?? 0)
    return remaining > 0 ? [{ ...entry, quantity: remaining }] : []
  })
}

export function completeDemoCheckout(cart, draft, storage, completedAt = new Date().toISOString()) {
  if (!cart.length || !tokenPattern.test(draft.token) || draft.signature !== cartSignature(cart) || draft.highestStep < 4 || !customerIds.has(draft.owner)) throw new Error('Complete the earlier checkout steps first.')
  const summary = calculateDemoTotal(selectionsFromCart(cart, draft.licences))
  const existing = readDemoCollection(storage)
  const previous = existing.find((receipt) => receipt.token === draft.token)
  if (previous) return previous
  const reference = referenceFromToken(draft.token)
  const receipt = {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    currency: 'NGN',
    token: draft.token,
    reference,
    completedAt,
    customerProfile: draft.owner,
    totalKobo: summary.totalKobo,
    items: summary.lines.map((line) => ({
      schemaVersion: RECEIPT_SCHEMA_VERSION,
      currency: 'NGN',
      productId: line.product.id,
      productTitle: line.product.name,
      quantity: line.quantity,
      baseUnitPriceKobo: line.baseUnitPriceKobo,
      licenceId: line.licence.id,
      licenceLabel: line.licence.label,
      licenceUpliftPercent: line.licence.adjustmentPercent,
      licensedUnitPriceKobo: line.licensedUnitPriceKobo,
      lineTotalKobo: line.lineTotalKobo,
      orderTotalKobo: summary.totalKobo,
      orderReference: reference,
      completedAt,
    })),
  }
  try {
    const target = storageOrDefault(storage)
    if (!target) throw new Error('No session storage')
    target.setItem(DEMO_COLLECTION_KEY, JSON.stringify([...existing, receipt].slice(-10)))
    return receipt
  } catch { throw new Error('Digital Wardrobe storage is unavailable. Your bag has not been cleared.') }
}
