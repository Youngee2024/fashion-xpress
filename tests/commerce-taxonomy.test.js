import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { displayIdentity, PROFILE_IDENTITIES } from '../src/data/communityRules.js'
import { products, RELEASE_TIERS, selectProducts } from '../src/data/products.js'
import { getRouteMeta } from '../src/data/routeMeta.js'

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')

test('all products expose stable release tiers while retaining compatibility data', () => {
  const mapping = { Limited: 'Limited Release', Rare: 'Signature Release', 'Ultra Rare': 'Atelier Release' }
  assert.equal(products.length, 9)
  for (const product of products) {
    assert.equal(product.releaseTier, mapping[product.rarity])
    assert.ok(Number.isInteger(product.stock) && product.stock > 0)
  }
  assert.equal(selectProducts({ filter: 'Limited Release' }).length, 3)
  assert.equal(selectProducts({ filter: 'Signature Release' }).length, 3)
  assert.equal(selectProducts({ filter: 'Atelier Release' }).length, 3)
  assert.deepEqual(selectProducts({ query: 'atelier release' }).map(({ id }) => id), ['solaris-cloak', 'quantum-silk', 'lagoon-protocol'])
  assert.deepEqual(RELEASE_TIERS.map(({ id }) => id), ['Limited Release', 'Signature Release', 'Atelier Release'])
  assert.match(RELEASE_TIERS.map(({ description }) => description).join(' '), /wider planned licence allocation.*smaller curated release.*smallest planned allocation/is)
})

test('primary collection and detail views use release tiers and planned allocations', async () => {
  const collection = `${await read('../src/pages/Collections.jsx')}\n${await read('../src/components/ProductCard.jsx')}\n${await read('../src/pages/ProductDetail.jsx')}`
  assert.match(collection, /All releases/)
  assert.match(collection, /Limited Release/)
  assert.match(collection, /Signature Release/)
  assert.match(collection, /Atelier Release/)
  assert.match(collection, /Planned allocation: \{product\.stock\} licences/)
  assert.match(collection, /Planned licence allocation/)
  assert.match(collection, /not live inventory/)
  assert.doesNotMatch(collection, /product\.rarity|Rarity concept score|\{product\.stock\} editions|limited-edition/i)
})

test('product detail preserves commerce action hierarchy and makes collectibles secondary', async () => {
  const source = await read('../src/pages/ProductDetail.jsx')
  const add = source.indexOf('Add to local bag')
  const tryOn = source.indexOf('Open Virtual Try-On')
  const collectible = source.indexOf('Explore collectible concept')
  assert.ok(add >= 0 && tryOn > add && collectible > tryOn)
  assert.match(source, /Collectibles Lab is separate from the Naira shopping journey/)
  assert.doesNotMatch(source, /Demo Wallet|Mint Studio|\bETH\b|gas|blockchain/i)
})

test('Collectibles Lab and legacy replacement routes are canonical', async () => {
  const app = await read('../src/App.jsx')
  const lab = await read('../src/pages/Collectibles.jsx')
  for (const route of ['/collectibles', '/collectibles/:id', '/collectibles/:id/complete', '/mint', '/mint/:id', '/mint/:id/complete']) assert.match(app, new RegExp(`path="${route.replaceAll('/', '\\/')}"`))
  assert.match(app, /<Navigate to=\{id \? `\/collectibles\/\$\{id\}/)
  assert.match(app, /replace \/>/)
  assert.match(lab, /Optional educational concept/)
  assert.match(lab, /No wallet connects.*no blockchain transaction occurs.*no NFT or token is created/is)
  assert.match(lab, /Return to Collections/)
  assert.match(lab, /Return to Digital Wardrobe/)
  assert.match(lab, /Reset demo collectibles/)
  assert.equal(getRouteMeta('/collectibles').title, 'Collectibles Lab | FashionXpress')
  assert.match(getRouteMeta('/collectibles/neo-safari').title, /Lab \| FashionXpress$/)
})

test('primary commerce and brand copy are no longer crypto-first', async () => {
  const primary = await Promise.all(['../src/pages/Home.jsx', '../src/pages/Collections.jsx', '../src/components/ProductCard.jsx', '../src/pages/ProductDetail.jsx', '../src/pages/Checkout.jsx', '../src/pages/DemoVault.jsx'].map(read)).then((values) => values.join('\n'))
  assert.doesNotMatch(primary, /Demo Wallet|Mint Studio|\bETH\b|gas estimate|NFT|on-chain|blockchain transaction/i)
  assert.doesNotMatch(primary, /For collectors|Rarity concept|limited-edition|\beditions\b/i)
  const home = await read('../src/pages/Home.jsx')
  const about = await read('../src/pages/About.jsx')
  const community = await read('../src/data/communityStore.js')
  assert.match(home, /Naira pricing.*digital-use licences.*Virtual Try-On.*Community/is)
  assert.match(home, /For digital wearers/)
  assert.match(about, /Collectibles Lab/)
  assert.doesNotMatch(about, /guided minting education/i)
  assert.match(community, /release tiers.*digital wearers/i)
})

test('Collector remains an internal compatibility value but displays as Fashion Enthusiast', async () => {
  assert.ok(PROFILE_IDENTITIES.includes('Collector'))
  assert.equal(displayIdentity('Collector'), 'Fashion Enthusiast')
  const profile = await read('../src/pages/Profile.jsx')
  assert.match(profile, /displayIdentity\(data\.identity\)/)
  assert.match(profile, /displayIdentity\(identity\)/)
})
