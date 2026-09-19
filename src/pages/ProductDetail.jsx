import { Link, Navigate, useParams } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { SafeImage } from '../components/SafeImage'
import { clearMintDraft } from '../data/demoMint'
import { productById } from '../data/products'

export function ProductDetail({ onAdd }) {
  const { id } = useParams()
  const product = productById[id]
  if (!product) return <Navigate to="/collections" replace/>

  return <section className="detail page-shell"><Link className="back-link" to="/collections">← Back to collection</Link><div className="detail-grid"><div className="detail-image"><SafeImage priority width="900" height="1350" src={product.image} alt={product.name}/><span>Concept edition of {product.stock}</span></div><div className="detail-copy"><span className="eyebrow">Genesis / {product.rarity}</span><h1>{product.name}</h1><p className="detail-price">{product.price.toFixed(1)} ETH <small>Concept price</small></p><p className="lead">{product.description}</p><div className="attribute"><div><span>Rarity concept score</span><strong>{product.score}/100</strong></div><div className="meter"><i style={{ width: `${product.score}%` }}/></div></div><dl><div><dt>Format concept</dt><dd>Wearable · Local overlay ready</dd></div><div><dt>Royalty concept</dt><dd>8% on resale</dd></div><div><dt>Network concept</dt><dd>Fictional demo networks only</dd></div></dl><div className="detail-actions"><button className="button full" onClick={() => onAdd(product)}>Add to local bag <Icon name="bag" size={17}/></button><Link className="button ghost full" to={`/mint/${product.id}?source=product&step=metadata`} onClick={() => clearMintDraft()}>Enter Demo Mint Studio</Link><Link className="button ghost full tryon-entry" to={`/ar-tryon?product=${product.id}`}>Open Virtual Try-On Prototype</Link></div><small>Portfolio listing · Manual overlay only; no accurate sizing, tracking, licence transfer, token, or blockchain transaction</small></div></div></section>
}
