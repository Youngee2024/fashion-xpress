import { CONCEPT_LICENCES } from './demoCheckout.js'
import { productById } from './products.js'

export const MINT_DRAFT_KEY = 'fashionxpress.demoMint.v1'
export const MINT_ASSETS_KEY = 'fashionxpress.demoMintAssets.v1'
export const MINT_STEPS = ['metadata', 'wallet', 'network', 'review', 'progress']
export const DEMO_WALLET = { id: 'studio-wallet', label: 'Demo Wallet', address: 'FX-DEMO…WALLET' }
export const CONCEPT_NETWORKS = [
  { id: 'atelier-local', name: 'Atelier Local', gasUnits: 2, purpose: 'A private studio preview.', impact: 'Lowest concept energy and cost.', status: 'Fictional local network' },
  { id: 'loom-garden', name: 'Loom Garden', gasUnits: 3, purpose: 'A collaborative creator showcase.', impact: 'Low-energy concept processing.', status: 'Fictional demonstration network' },
  { id: 'archive-grid', name: 'Archive Grid', gasUnits: 5, purpose: 'A long-form provenance study.', impact: 'Higher concept storage cost.', status: 'Fictional demonstration network' },
]

const networkById = Object.fromEntries(CONCEPT_NETWORKS.map((network) => [network.id, network]))
const licenceIds = new Set(CONCEPT_LICENCES.map((licence) => licence.id))
const entrySources = new Set(['direct', 'product', 'checkout', 'vault'])
const tokenPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i

function storageOrDefault(storage) { return storage ?? globalThis.sessionStorage }
function newToken() { return globalThis.crypto.randomUUID() }

export function formatDemoUnits(units) {
  if (!Number.isSafeInteger(units) || units < 0) throw new Error('Invalid demo amount.')
  return `${Math.floor(units / 10)}.${units % 10} demo units`
}

export function deriveMintMetadata(productId, licence = 'personal') {
  const product = productById[productId]
  if (!product || !licenceIds.has(licence)) throw new Error('Unsupported demo asset.')
  return {
    product,
    licence,
    edition: `Concept 1 of ${product.stock}`,
    mediaType: 'image/jpeg',
    identifier: `demo:metadata:${product.id}`,
    attributes: [
      ['Rarity concept', product.rarity],
      ['Concept score', `${product.score}/100`],
      ['Format', 'Digital wearable preview'],
    ],
  }
}

export function calculateMintSummary(productId, networkId, licence = 'personal') {
  const metadata = deriveMintMetadata(productId, licence)
  const network = networkById[networkId]
  if (!network) throw new Error('Unsupported concept network.')
  return { metadata, network, mintUnits: metadata.product.priceUnits, gasUnits: network.gasUnits, totalUnits: metadata.product.priceUnits + network.gasUnits }
}

export function freshMintDraft(productId, options = {}, token = newToken()) {
  if (!productById[productId]) throw new Error('Unsupported product.')
  return {
    version: 1,
    productId,
    token,
    entrySource: entrySources.has(options.entrySource) ? options.entrySource : 'direct',
    licence: licenceIds.has(options.licence) ? options.licence : 'personal',
    walletActive: false,
    networkId: 'atelier-local',
    highestStep: 0,
    step: 'metadata',
    progressIndex: 0,
    acknowledged: false,
  }
}

function validDraft(value, productId) {
  const stepIndex = MINT_STEPS.indexOf(value?.step)
  const validProgress = value?.step === 'progress' ? value.highestStep === 4 : value?.progressIndex === 0
  return value?.version === 1 && value.productId === productId && productById[productId] && tokenPattern.test(value.token) && entrySources.has(value.entrySource) && licenceIds.has(value.licence) && typeof value.walletActive === 'boolean' && networkById[value.networkId] && Number.isInteger(value.highestStep) && value.highestStep >= 0 && value.highestStep < MINT_STEPS.length && stepIndex >= 0 && stepIndex <= value.highestStep && Number.isInteger(value.progressIndex) && value.progressIndex >= 0 && value.progressIndex <= 4 && validProgress && typeof value.acknowledged === 'boolean'
}

export function readMintDraft(productId, storage, options = {}) {
  if (!productById[productId]) return null
  try {
    const target = storageOrDefault(storage)
    const raw = target?.getItem(MINT_DRAFT_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (validDraft(parsed, productId)) return parsed
    if (raw) target?.removeItem(MINT_DRAFT_KEY)
  } catch { /* Corrupt or unavailable session storage starts a clean demonstration. */ }
  return freshMintDraft(productId, options)
}

export function writeMintDraft(draft, storage) {
  if (!validDraft(draft, draft?.productId)) return false
  try { storageOrDefault(storage)?.setItem(MINT_DRAFT_KEY, JSON.stringify(draft)); return true } catch { return false }
}

export function clearMintDraft(storage) {
  try { storageOrDefault(storage)?.removeItem(MINT_DRAFT_KEY) } catch { /* Session storage may be unavailable. */ }
}

function assetIdentity(token, productId) {
  const suffix = token.replaceAll('-', '').slice(0, 8).toUpperCase()
  return { assetId: `demo:asset:${productId}:${suffix}`, transactionReference: `demo:simulation:${suffix}` }
}

function validAsset(asset) {
  if (!asset || !tokenPattern.test(asset.token) || !productById[asset.productId] || !licenceIds.has(asset.licence) || !networkById[asset.networkId] || Number.isNaN(Date.parse(asset.completedAt))) return false
  const identity = assetIdentity(asset.token, asset.productId)
  return asset.assetId === identity.assetId && asset.transactionReference === identity.transactionReference && asset.edition === `Concept 1 of ${productById[asset.productId].stock}`
}

export function readMintAssets(storage) {
  try {
    const target = storageOrDefault(storage)
    const raw = target?.getItem(MINT_ASSETS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length > 20 || !parsed.every(validAsset) || new Set(parsed.map((asset) => asset.token)).size !== parsed.length || new Set(parsed.map((asset) => asset.assetId)).size !== parsed.length) throw new Error('Invalid Demo Vault data.')
    return parsed
  } catch {
    try { storageOrDefault(storage)?.removeItem(MINT_ASSETS_KEY) } catch { /* Safe empty fallback. */ }
    return []
  }
}

export function completeDemoMint(draft, storage, completedAt = new Date().toISOString()) {
  if (!validDraft(draft, draft?.productId) || draft.step !== 'progress' || draft.highestStep < 4 || draft.progressIndex < 4 || !draft.walletActive || !draft.acknowledged) throw new Error('Complete the earlier demo mint steps first.')
  const assets = readMintAssets(storage)
  const previous = assets.find((asset) => asset.token === draft.token)
  if (previous) return previous
  const identity = assetIdentity(draft.token, draft.productId)
  const asset = { token: draft.token, ...identity, productId: draft.productId, licence: draft.licence, networkId: draft.networkId, edition: `Concept 1 of ${productById[draft.productId].stock}`, completedAt }
  try {
    const target = storageOrDefault(storage)
    if (!target) throw new Error('No session storage')
    target.setItem(MINT_ASSETS_KEY, JSON.stringify([...assets, asset].slice(-20)))
    return asset
  } catch { throw new Error('Demo Vault storage is unavailable. Nothing was created.') }
}

export function removeMintAsset(assetId, storage) {
  const remaining = readMintAssets(storage).filter((asset) => asset.assetId !== assetId)
  try { storageOrDefault(storage)?.setItem(MINT_ASSETS_KEY, JSON.stringify(remaining)); return remaining } catch { return readMintAssets(storage) }
}

export function resetMintAssets(storage) {
  try { storageOrDefault(storage)?.removeItem(MINT_ASSETS_KEY) } catch { /* The UI will show its safe empty fallback. */ }
}

export function getConceptNetwork(networkId) { return networkById[networkId] ?? null }
