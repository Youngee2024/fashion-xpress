import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SafeImage } from '../components/SafeImage'
import { CONCEPT_LICENCES } from '../data/demoCheckout'
import { clearMintDraft, getConceptNetwork, readMintAssets, removeMintAsset, resetMintAssets } from '../data/demoMint'
import { productById, products } from '../data/products'

function CollectibleRecord({ asset, onRemove }) {
  const product = productById[asset.productId]
  const licence = CONCEPT_LICENCES.find((option) => option.id === asset.licence)
  const network = getConceptNetwork(asset.networkId)
  return <article className="vault-piece vault-asset"><Link to={`/collections/${product.id}`} aria-label={`View ${product.name}`}><SafeImage src={product.image} alt="" width="180" height="236"/></Link><div><span className="eyebrow">Demo collectible · Not on-chain</span><h3><Link to={`/collections/${product.id}`}>{product.name}</Link></h3><p>{product.creator}</p><dl><div><dt>Demo asset ID</dt><dd className="demo-identifier">{asset.assetId}</dd></div><div><dt>Fictional network</dt><dd>{network.name}</dd></div><div><dt>Collectible edition concept</dt><dd>{asset.edition}</dd></div><div><dt>Concept licence</dt><dd>{licence.label}</dd></div><div><dt>Created locally</dt><dd>{new Date(asset.completedAt).toLocaleString()}</dd></div><div><dt>Status</dt><dd>Local simulation · Not purchased or owned</dd></div></dl><div className="checkout-controls"><Link className="button ghost" to={`/collectibles/${product.id}?source=vault&licence=${asset.licence}&step=metadata`} onClick={() => clearMintDraft()}>Restart collectible demo</Link><Link className="text-link" to={`/collections/${product.id}`}>View product</Link><button className="text-link" type="button" onClick={() => onRemove(asset.assetId)}>Remove local collectible</button></div></div></article>
}

export function Collectibles() {
  const [assets, setAssets] = useState(() => readMintAssets())
  const [message, setMessage] = useState('')

  function resetAll() {
    if (!window.confirm('Clear every demo collectible from this browser session?')) return
    resetMintAssets()
    setAssets([])
    setMessage('Demo collectibles cleared. Nothing online or on-chain was affected.')
  }

  function remove(assetId) {
    if (!window.confirm('Remove this demo collectible from the current browser session?')) return
    setAssets(removeMintAsset(assetId))
    setMessage('Demo collectible removed. Nothing online or on-chain was affected.')
  }

  return <section className="page-shell collectibles-lab"><header><span className="eyebrow">Optional educational concept</span><h1>Collectibles Lab.</h1><p>This separate experience demonstrates how a digital collectible interface could work. No wallet connects, no blockchain transaction occurs, no NFT or token is created, no ownership or licence transfers, and nothing is published on-chain.</p><div className="checkout-controls"><Link className="button" to="/collections">Return to Collections</Link><Link className="button ghost" to="/digital-wardrobe">Return to Digital Wardrobe</Link></div></header><p className="sr-status" role="status" aria-live="polite">{message}</p>
    <section className="collectibles-records" aria-labelledby="collectible-records-title"><div className="legacy-collectibles-heading"><div><span className="eyebrow">Session-only records</span><h2 id="collectible-records-title">Your demo collectibles</h2><p>These local blockchain-concept simulations are not Naira purchases, Wardrobe items, or assets with financial or transferable value.</p></div>{assets.length > 0 && <button className="text-link" type="button" onClick={resetAll}>Reset demo collectibles</button>}</div>{assets.length > 0 ? <div className="vault-pieces">{assets.toReversed().map((asset) => <CollectibleRecord key={asset.assetId} asset={asset} onRemove={remove}/>)}</div> : <div className="panel checkout-empty"><h3>No demo collectibles yet.</h3><p>Select an eligible piece below to explore the local simulation. Nothing will be created online.</p></div>}</section>
    <section className="collectibles-eligible" aria-labelledby="collectible-products-title"><span className="eyebrow">Eligible concept pieces</span><h2 id="collectible-products-title">Choose a demonstration.</h2><div className="collectibles-grid">{products.map((product) => <article className="panel collectible-product" key={product.id}><SafeImage src={product.image} alt="" width="300" height="400"/><div><span>{product.releaseTier}</span><h3>{product.name}</h3><p>{product.creator}</p><Link className="button ghost" to={`/collectibles/${product.id}?source=direct&step=metadata`} onClick={() => clearMintDraft()}>Explore demo collectible</Link></div></article>)}</div></section>
  </section>
}
