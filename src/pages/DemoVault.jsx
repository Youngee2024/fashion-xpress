import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SafeImage } from '../components/SafeImage'
import { CONCEPT_LICENCES, calculateDemoTotal, formatConceptUnits, readDemoCollection, resetDemoCollection } from '../data/demoCheckout'
import { clearMintDraft, getConceptNetwork, readMintAssets, removeMintAsset, resetMintAssets } from '../data/demoMint'
import { productById } from '../data/products'

function CheckoutPiece({ item }) {
  const product = productById[item.id]
  const licence = CONCEPT_LICENCES.find((option) => option.id === item.licence)
  return <article className="vault-piece"><Link to={`/collections/${product.id}`}><SafeImage src={product.image} alt="" width="180" height="236"/></Link><div><span className="eyebrow">Checkout concept item</span><h3><Link to={`/collections/${product.id}`}>{product.name}</Link></h3><p>{product.creator}</p><p>{licence.label} · Quantity {item.quantity}</p><Link className="button ghost" to={`/mint/${product.id}?source=checkout&licence=${item.licence}&step=metadata`} onClick={() => clearMintDraft()}>Enter Demo Mint Studio</Link></div></article>
}

function MintAsset({ asset, onRemove }) {
  const product = productById[asset.productId]
  const licence = CONCEPT_LICENCES.find((option) => option.id === asset.licence)
  const network = getConceptNetwork(asset.networkId)
  return <article className="vault-piece vault-asset"><Link to={`/collections/${product.id}`}><SafeImage src={product.image} alt="" width="180" height="236"/></Link><div><span className="eyebrow">Minted concept asset · Not on-chain</span><h3><Link to={`/collections/${product.id}`}>{product.name}</Link></h3><p>{product.creator}</p><dl><div><dt>Demo asset ID</dt><dd className="demo-identifier">{asset.assetId}</dd></div><div><dt>Concept network</dt><dd>{network.name} · fictional</dd></div><div><dt>Edition</dt><dd>{asset.edition}</dd></div><div><dt>Concept licence</dt><dd>{licence.label}</dd></div><div><dt>Mint-demo date</dt><dd>{new Date(asset.completedAt).toLocaleString()}</dd></div><div><dt>Status</dt><dd>Not on-chain</dd></div></dl><div className="checkout-controls"><Link className="button ghost" to={`/mint/${product.id}?source=vault&licence=${asset.licence}&step=metadata`} onClick={() => clearMintDraft()}>Restart mint demo</Link><button className="text-link" type="button" onClick={() => onRemove(asset.assetId)}>Remove local asset</button></div></div></article>
}

export function DemoVault() {
  const [receipts, setReceipts] = useState(() => readDemoCollection())
  const [assets, setAssets] = useState(() => readMintAssets())
  const [message, setMessage] = useState('')
  const hasRecords = receipts.length > 0 || assets.length > 0

  function resetAll() {
    resetDemoCollection()
    resetMintAssets()
    setReceipts([])
    setAssets([])
    setMessage('Demo Vault reset. No online, owned, or on-chain items were affected.')
  }

  function removeAsset(assetId) {
    if (!window.confirm('Remove this local concept asset from the Demo Vault?')) return
    setAssets(removeMintAsset(assetId))
    setMessage('Local concept asset removed. Nothing on-chain was affected.')
  }

  return <section className="page-shell checkout-page demo-vault"><span className="eyebrow">Local portfolio demonstration</span><h1>Demo Vault.</h1><p>Checkout concepts and mint simulations are separated below. Nothing is owned, minted, licensed, scarce, transferable, stored online, or on-chain. Every record has zero monetary value and stays in this browser tab.</p><p role="status" aria-live="polite">{message}</p>{hasRecords ? <><div className="checkout-controls"><button className="button ghost" type="button" onClick={() => { if (window.confirm('Reset every local record in this Demo Vault?')) resetAll() }}>Reset entire Demo Vault</button><Link className="text-link" to="/collections">Explore Collections</Link></div>{receipts.length > 0 && <section className="vault-section"><h2>Checkout concept items</h2><p>Local checkout demonstrations. These items were not purchased and grant no rights.</p>{receipts.toReversed().map((receipt) => <div className="vault-group panel" key={receipt.token}><h3>{receipt.reference}</h3><p>{new Date(receipt.completedAt).toLocaleDateString()} · Concept total: {formatConceptUnits(calculateDemoTotal(receipt.items).totalUnits)}</p><div className="vault-pieces">{receipt.items.map((item) => <CheckoutPiece key={item.id} item={item}/>)}</div></div>)}</section>}{assets.length > 0 && <section className="vault-section"><h2>Minted concept assets</h2><p>Local interface records only. No NFT, token, contract execution, or public metadata exists.</p><div className="vault-pieces">{assets.toReversed().map((asset) => <MintAsset key={asset.assetId} asset={asset} onRemove={removeAsset}/>)}</div></section>}</> : <div className="panel checkout-empty"><h2>No local demo records yet.</h2><p>Complete a checkout or mint demonstration to preview it here. Corrupted or unavailable session data is discarded safely.</p><Link className="button" to="/collections">Find a concept piece</Link></div>}</section>
}
