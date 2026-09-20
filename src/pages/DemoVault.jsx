import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SafeImage } from '../components/SafeImage'
import { formatNaira } from '../data/commercePricing'
import { CONCEPT_LICENCES, consumeLegacyCollectionNotice, readDemoCollection, resetDemoCollection } from '../data/demoCheckout'
import { clearMintDraft, getConceptNetwork, readMintAssets, removeMintAsset, resetMintAssets } from '../data/demoMint'
import { productById } from '../data/products'

function WardrobeItem({ item, receipt }) {
  const product = productById[item.productId]
  return <article className="vault-piece wardrobe-item"><Link to={`/collections/${product.id}`} aria-label={`View ${item.productTitle}`}><SafeImage src={product.image} alt="" width="180" height="236"/></Link><div><span className="eyebrow">Wardrobe item</span><h3><Link to={`/collections/${product.id}`}>{item.productTitle}</Link></h3><p>{product.creator}</p><dl><div><dt>Quantity</dt><dd>{item.quantity}</dd></div><div><dt>Digital-use licence</dt><dd>{item.licenceLabel}</dd></div><div><dt>Base price</dt><dd>{formatNaira(item.baseUnitPriceKobo)} each</dd></div><div><dt>Licence-adjusted price</dt><dd>{formatNaira(item.licensedUnitPriceKobo)} each</dd></div><div><dt>Line total</dt><dd>{formatNaira(item.lineTotalKobo)}</dd></div><div><dt>Demo order reference</dt><dd className="demo-identifier">{receipt.reference}</dd></div><div><dt>Demo order date</dt><dd>{new Date(receipt.completedAt).toLocaleString()}</dd></div><div><dt>Status</dt><dd>Demo licence—not transferred</dd></div></dl><div className="vault-entry-actions"><Link className="button ghost" to={`/collections/${product.id}`}>View product</Link><Link className="text-link" to={`/ar-tryon?product=${product.id}`}>Open Virtual Try-On</Link><Link className="text-link" to="/licensing">View licence explanation</Link></div></div></article>
}

function LegacyCollectible({ asset, onRemove }) {
  const product = productById[asset.productId]
  const licence = CONCEPT_LICENCES.find((option) => option.id === asset.licence)
  const network = getConceptNetwork(asset.networkId)
  return <article className="vault-piece vault-asset"><Link to={`/collections/${product.id}`} aria-label={`View ${product.name}`}><SafeImage src={product.image} alt="" width="180" height="236"/></Link><div><span className="eyebrow">Legacy demo collectible · Not on-chain</span><h3><Link to={`/collections/${product.id}`}>{product.name}</Link></h3><p>{product.creator}</p><dl><div><dt>Demo asset ID</dt><dd className="demo-identifier">{asset.assetId}</dd></div><div><dt>Concept network</dt><dd>{network.name} · fictional</dd></div><div><dt>Edition</dt><dd>{asset.edition}</dd></div><div><dt>Concept licence</dt><dd>{licence.label}</dd></div><div><dt>Mint-demo date</dt><dd>{new Date(asset.completedAt).toLocaleString()}</dd></div><div><dt>Status</dt><dd>Local simulation · Not purchased or owned</dd></div></dl><div className="checkout-controls"><Link className="button ghost" to={`/mint/${product.id}?source=vault&licence=${asset.licence}&step=metadata`} onClick={() => clearMintDraft()}>Restart collectible demo</Link><Link className="text-link" to={`/collections/${product.id}`}>View product</Link><button className="text-link" type="button" onClick={() => onRemove(asset.assetId)}>Remove local collectible</button></div></div></article>
}

export function DigitalWardrobe() {
  const [receipts, setReceipts] = useState(() => readDemoCollection())
  const [assets, setAssets] = useState(() => readMintAssets())
  const [message, setMessage] = useState(() => consumeLegacyCollectionNotice() ? 'An earlier concept checkout was cleared after the Naira pricing update.' : '')

  function resetWardrobe() {
    if (!window.confirm('Clear every local checkout record from this Digital Wardrobe? Legacy demo collectibles will remain separate.')) return
    resetDemoCollection()
    setReceipts([])
    setMessage('Digital Wardrobe cleared. No real order or licence was affected.')
  }

  function resetCollectibles() {
    if (!window.confirm('Clear every legacy demo collectible from this browser session?')) return
    resetMintAssets()
    setAssets([])
    setMessage('Legacy demo collectibles cleared. Nothing online or on-chain was affected.')
  }

  function removeAsset(assetId) {
    if (!window.confirm('Remove this legacy demo collectible from the current browser session?')) return
    setAssets(removeMintAsset(assetId))
    setMessage('Legacy demo collectible removed. Nothing online or on-chain was affected.')
  }

  return <section className="page-shell checkout-page digital-wardrobe"><span className="eyebrow">Session-only fashion library</span><h1>Digital Wardrobe.</h1><p>Review local Demo Mode checkout records and their illustrative digital-use licences. Nothing here proves ownership, grants resale rights, or persists beyond this browser session.</p><p role="status" aria-live="polite">{message}</p><div className="checkout-controls wardrobe-top-actions"><Link className="button" to="/collections">Continue shopping</Link>{receipts.length > 0 && <button className="button ghost" type="button" onClick={resetWardrobe}>Reset Digital Wardrobe</button>}</div>
    <section className="vault-section wardrobe-primary" aria-labelledby="wardrobe-items-title"><h2 id="wardrobe-items-title">Wardrobe items</h2><p>Checkout-derived records appear first. No payment, real order, or legal licence transfer occurred.</p>{receipts.length > 0 ? receipts.toReversed().map((receipt) => <div className="vault-group panel" key={receipt.token}><div className="wardrobe-order-heading"><div><span className="eyebrow">Demo order</span><h3>{receipt.reference}</h3></div><p>{new Date(receipt.completedAt).toLocaleDateString()} · {formatNaira(receipt.totalKobo)}</p></div><div className="vault-pieces">{receipt.items.map((item) => <WardrobeItem key={item.productId} item={item} receipt={receipt}/>)}</div></div>) : <div className="panel checkout-empty"><h3>Your Digital Wardrobe is empty.</h3><p>Complete the Naira demo checkout to add a session-only Wardrobe record. Corrupted or unavailable receipt data is discarded safely.</p><Link className="button" to="/collections">Discover digital pieces</Link></div>}</section>
    <section className="vault-section legacy-collectibles" aria-labelledby="legacy-collectibles-title"><div className="legacy-collectibles-heading"><div><h2 id="legacy-collectibles-title">Legacy demo collectibles</h2><p>Optional local blockchain-concept simulations. They are not Wardrobe purchases, owned assets, NFTs, or Naira orders, and their concept values are never converted.</p></div>{assets.length > 0 && <button className="text-link" type="button" onClick={resetCollectibles}>Reset legacy collectibles</button>}</div>{assets.length > 0 ? <div className="vault-pieces">{assets.toReversed().map((asset) => <LegacyCollectible key={asset.assetId} asset={asset} onRemove={removeAsset}/>)}</div> : <p className="legacy-empty">No legacy collectible simulations in this browser session.</p>}</section>
  </section>
}
