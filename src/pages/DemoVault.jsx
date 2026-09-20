import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SafeImage } from '../components/SafeImage'
import { formatNaira } from '../data/commercePricing'
import { consumeLegacyCollectionNotice, readDemoCollection, resetDemoCollection } from '../data/demoCheckout'
import { productById } from '../data/products'

function WardrobeItem({ item, receipt }) {
  const product = productById[item.productId]
  return <article className="vault-piece wardrobe-item"><Link to={`/collections/${product.id}`} aria-label={`View ${item.productTitle}`}><SafeImage src={product.image} alt="" width="180" height="236"/></Link><div><span className="eyebrow">Wardrobe item</span><h3><Link to={`/collections/${product.id}`}>{item.productTitle}</Link></h3><p>{product.creator}</p><dl><div><dt>Quantity</dt><dd>{item.quantity}</dd></div><div><dt>Digital-use licence</dt><dd>{item.licenceLabel}</dd></div><div><dt>Base price</dt><dd>{formatNaira(item.baseUnitPriceKobo)} each</dd></div><div><dt>Licence-adjusted price</dt><dd>{formatNaira(item.licensedUnitPriceKobo)} each</dd></div><div><dt>Line total</dt><dd>{formatNaira(item.lineTotalKobo)}</dd></div><div><dt>Demo order reference</dt><dd className="demo-identifier">{receipt.reference}</dd></div><div><dt>Demo order date</dt><dd>{new Date(receipt.completedAt).toLocaleString()}</dd></div><div><dt>Status</dt><dd>Demo licence—not transferred</dd></div></dl><div className="vault-entry-actions"><Link className="button ghost" to={`/collections/${product.id}`}>View product</Link><Link className="text-link" to={`/ar-tryon?product=${product.id}`}>Open Virtual Try-On</Link><Link className="text-link" to="/licensing">View licence explanation</Link></div></div></article>
}

export function DigitalWardrobe() {
  const [receipts, setReceipts] = useState(() => readDemoCollection())
  const [message, setMessage] = useState(() => consumeLegacyCollectionNotice() ? 'An earlier concept checkout was cleared after the Naira pricing update.' : '')

  function resetWardrobe() {
    if (!window.confirm('Clear every local checkout record from this Digital Wardrobe?')) return
    resetDemoCollection()
    setReceipts([])
    setMessage('Digital Wardrobe cleared. No real order or licence was affected.')
  }

  return <section className="page-shell checkout-page digital-wardrobe"><span className="eyebrow">Session-only fashion library</span><h1>Digital Wardrobe.</h1><p>Review local Demo Mode checkout records and their illustrative digital-use licences. Nothing here proves ownership, grants resale rights, or persists beyond this browser session.</p><p role="status" aria-live="polite">{message}</p><div className="checkout-controls wardrobe-top-actions"><Link className="button" to="/collections">Continue shopping</Link>{receipts.length > 0 && <button className="button ghost" type="button" onClick={resetWardrobe}>Reset Digital Wardrobe</button>}</div>
    <section className="vault-section wardrobe-primary" aria-labelledby="wardrobe-items-title"><h2 id="wardrobe-items-title">Wardrobe items</h2><p>Checkout-derived records appear here. No payment, real order, or legal licence transfer occurred.</p>{receipts.length > 0 ? receipts.toReversed().map((receipt) => <div className="vault-group panel" key={receipt.token}><div className="wardrobe-order-heading"><div><span className="eyebrow">Demo order</span><h3>{receipt.reference}</h3></div><p>{new Date(receipt.completedAt).toLocaleDateString()} · {formatNaira(receipt.totalKobo)}</p></div><div className="vault-pieces">{receipt.items.map((item) => <WardrobeItem key={item.productId} item={item} receipt={receipt}/>)}</div></div>) : <div className="panel checkout-empty"><h3>Your Digital Wardrobe is empty.</h3><p>Complete the Naira demo checkout to add a session-only Wardrobe record. Corrupted or unavailable receipt data is discarded safely.</p><Link className="button" to="/collections">Discover digital pieces</Link></div>}</section>
    <aside className="panel wardrobe-collectibles-callout"><span className="eyebrow">Separate optional concept</span><h2>Looking for your demo collectibles?</h2><p>Visit the Collectibles Lab. Its local simulations are not purchases, Wardrobe items, or owned assets.</p><Link className="text-link" to="/collectibles">Visit the Collectibles Lab</Link></aside>
  </section>
}
