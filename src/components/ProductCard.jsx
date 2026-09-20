import { Link } from 'react-router-dom'
import { formatNaira } from '../data/commercePricing'
import { Icon } from './Icons'
import { SafeImage } from './SafeImage'
export function ProductCard({ product, onAdd }) { return <article className="product-card"><Link className="product-image" to={`/collections/${product.id}`}><SafeImage src={product.image} alt={product.name}/><span className="release-tier">{product.releaseTier}</span></Link><div className="product-copy"><div><Link to={`/collections/${product.id}`}><h3>{product.name}</h3></Link><p>Planned allocation: {product.stock} licences</p></div><div className="product-price"><div><small>Starting at</small><strong>{formatNaira(product.priceKobo)}</strong></div><button onClick={() => onAdd(product)} aria-label={`Add ${product.name} to bag`}><Icon name="plus" size={18}/></button></div></div><small className="allocation-note">Illustrative in Demo Mode · not live inventory</small></article> }
