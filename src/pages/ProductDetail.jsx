import { Link, Navigate, useParams } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { productById } from '../data/products'

export function ProductDetail({ onAdd }) {
  const { id } = useParams(); const product = productById[id]
  if (!product) return <Navigate to="/collections" replace/>
  return <section className="detail page-shell"><Link className="back-link" to="/collections">← Back to collection</Link><div className="detail-grid"><div className="detail-image"><img src={product.image} alt={product.name}/><span>Edition of {product.stock}</span></div><div className="detail-copy"><span className="eyebrow">Genesis / {product.rarity}</span><h1>{product.name}</h1><p className="detail-price">{product.price.toFixed(1)} ETH</p><p className="lead">{product.description}</p><div className="attribute"><div><span>Rarity score</span><strong>{product.score}/100</strong></div><div className="meter"><i style={{width: `${product.score}%`}}/></div></div><dl><div><dt>Format</dt><dd>Wearable · AR ready</dd></div><div><dt>Creator royalty</dt><dd>8% on resale</dd></div><div><dt>Chain</dt><dd>Ethereum L2</dd></div></dl><div className="detail-actions"><button className="button full" onClick={() => onAdd(product)}>Add to bag <Icon name="bag" size={17}/></button><Link className="button ghost full" to={`/mint/${product.id}`}>Mint directly</Link></div><small>Verified origin · Carbon-conscious minting · Personal use license</small></div></div></section>
}
