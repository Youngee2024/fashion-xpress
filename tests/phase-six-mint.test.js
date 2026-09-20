import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  MINT_ASSETS_KEY,
  MINT_DRAFT_KEY,
  calculateMintSummary,
  completeDemoMint,
  deriveMintMetadata,
  freshMintDraft,
  readMintAssets,
  readMintDraft,
  removeMintAsset,
  resetMintAssets,
  writeMintDraft,
} from '../src/data/demoMint.js'

const token = '12345678-1234-4123-8123-123456789abc'

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
}

test('metadata is derived from trusted products and uses a local demo identifier', () => {
  const metadata = deriveMintMetadata('neo-safari', 'social')
  assert.equal(metadata.product.name, 'Neo-Safari 2026')
  assert.equal(metadata.identifier, 'demo:metadata:neo-safari')
  assert.equal(metadata.licence, 'social')
  assert.match(metadata.edition, /^Concept 1 of /)
  assert.throws(() => deriveMintMetadata('unknown', 'personal'), /Unsupported/)
  assert.throws(() => deriveMintMetadata('neo-safari', 'unknown'), /Unsupported/)
})

test('concept network totals use deterministic integer units', () => {
  const summary = calculateMintSummary('neo-safari', 'loom-garden', 'personal')
  assert.deepEqual({ mint: summary.mintUnits, gas: summary.gasUnits, total: summary.totalUnits }, { mint: 25, gas: 3, total: 28 })
  assert.equal(summary.network.status, 'Fictional demonstration network')
  assert.throws(() => calculateMintSummary('neo-safari', 'real-chain'), /Unsupported concept network/)
})

test('Demo Wallet state is session-only and supports activate, disconnect and reset', () => {
  const storage = memoryStorage()
  const base = freshMintDraft('neo-safari', { entrySource: 'product' }, token)
  const active = { ...base, walletActive: true, highestStep: 1, step: 'wallet' }
  assert.equal(writeMintDraft(active, storage), true)
  assert.equal(readMintDraft('neo-safari', storage).walletActive, true)
  assert.equal(writeMintDraft({ ...active, walletActive: false }, storage), true)
  assert.equal(readMintDraft('neo-safari', storage).walletActive, false)
  const reset = freshMintDraft('neo-safari', { entrySource: 'product' }, token)
  assert.equal(reset.walletActive, false)
  assert.equal(reset.step, 'metadata')
})

test('invalid direct steps and corrupted draft values recover to metadata', () => {
  const storage = memoryStorage()
  const invalid = { ...freshMintDraft('neo-safari', {}, token), step: 'review', highestStep: 0 }
  storage.setItem(MINT_DRAFT_KEY, JSON.stringify(invalid))
  const recovered = readMintDraft('neo-safari', storage)
  assert.equal(recovered.step, 'metadata')
  assert.equal(recovered.highestStep, 0)
  storage.setItem(MINT_DRAFT_KEY, '{bad json')
  assert.equal(readMintDraft('neo-safari', storage).step, 'metadata')
})

test('acknowledgement and completed progress are required before idempotent completion', () => {
  const storage = memoryStorage()
  const base = { ...freshMintDraft('neo-safari', {}, token), step: 'progress', highestStep: 4, progressIndex: 4, walletActive: true }
  assert.throws(() => completeDemoMint(base, storage), /earlier demo mint steps/)
  const ready = { ...base, acknowledged: true }
  const first = completeDemoMint(ready, storage, '2026-09-19T12:00:00.000Z')
  const second = completeDemoMint(ready, storage, '2026-09-19T13:00:00.000Z')
  assert.deepEqual(second, first)
  assert.equal(first.assetId, 'demo:asset:neo-safari:12345678')
  assert.equal(first.transactionReference, 'demo:simulation:12345678')
  assert.equal(readMintAssets(storage).length, 1)
})

test('legacy collectible records support individual removal, full reset and corruption recovery', () => {
  const storage = memoryStorage()
  const ready = { ...freshMintDraft('neo-safari', {}, token), step: 'progress', highestStep: 4, progressIndex: 4, walletActive: true, acknowledged: true }
  const asset = completeDemoMint(ready, storage)
  assert.deepEqual(removeMintAsset(asset.assetId, storage), [])
  completeDemoMint(ready, storage)
  resetMintAssets(storage)
  assert.deepEqual(readMintAssets(storage), [])
  storage.setItem(MINT_ASSETS_KEY, '{corrupt')
  assert.deepEqual(readMintAssets(storage), [])
  assert.equal(storage.getItem(MINT_ASSETS_KEY), null)
})

test('mint source and dependencies contain no wallet provider or blockchain integration', async () => {
  const mintSource = `${await readFile(new URL('../src/pages/Mint.jsx', import.meta.url), 'utf8')}\n${await readFile(new URL('../src/data/demoMint.js', import.meta.url), 'utf8')}`
  const packageJson = await readFile(new URL('../package.json', import.meta.url), 'utf8')
  assert.doesNotMatch(mintSource, /window\.ethereum|globalThis\.ethereum|etherscan|blockscout|walletconnect|\/api\//i)
  assert.doesNotMatch(packageJson, /"(?:ethers|viem|web3|wagmi|@walletconnect\/[^"/]+)"\s*:/i)
  assert.doesNotMatch(mintSource, /0x[a-f0-9]{40,}/i)
  assert.match(mintSource, /prefers-reduced-motion/)
  assert.match(mintSource, /Nothing was created on-chain/)
  assert.match(mintSource, /No NFT or token will be created/)
})
