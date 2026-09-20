import { Link, Navigate, useParams } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { SafeImage } from '../components/SafeImage'
import { formatNaira } from '../data/commercePricing'
import { clearMintDraft } from '../data/demoMint'
import { productById } from '../data/products'

export function ProductDetail({ onAdd }) {
  const { id } = useParams()
  const product = productById[id]
  if (!product) return <Navigate to="/collections" replace/>

  return <section className="detail page-shell"><Link className="back-link" to="/collections">← Back to collection</Link><div className="detail-grid"><div className="detail-image"><SafeImage priority width="900" height="1350" src={product.image} alt={product.name}/><span>{product.releaseTier}</span></div><div className="detail-copy"><span className="eyebrow">Genesis / {product.releaseTier}</span><h1>{product.name}</h1><p className="detail-price">{formatNaira(product.priceKobo)} <small>Starting digital-use licence</small></p><p className="lead">{product.description}</p><dl><div><dt>Release tier</dt><dd>{product.releaseTier}</dd></div><div><dt>Planned licence allocation</dt><dd>{product.stock} licences</dd></div><div><dt>Format</dt><dd>Digital wearable preview</dd></div><div><dt>Starting access</dt><dd>Personal-use licence concept</dd></div><div><dt>Try-On</dt><dd>Local manual overlay ready</dd></div></dl><p className="allocation-note">The planned allocation is illustrative in Demo Mode. It is not live inventory and does not decrease after checkout.</p><div className="detail-actions"><button className="button full" onClick={() => onAdd(product)}>Add to local bag <Icon name="bag" size={17}/></button><Link className="button ghost full" to={`/ar-tryon?product=${product.id}`}>Open Virtual Try-On</Link></div><aside className="collectible-entry"><strong>Optional educational concept</strong><p>Collectibles Lab is separate from the Naira shopping journey.</p><Link className="text-link" to={`/collectibles/${product.id}?source=product&step=metadata`} onClick={() => clearMintDraft()}>Explore collectible concept <Icon name="arrow" size={16}/></Link></aside><small>Portfolio listing · No real payment, order, inventory reservation, or digital-use licence transfer occurs</small></div></div></section>
}
