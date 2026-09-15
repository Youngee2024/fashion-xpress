import { Link, Navigate, useParams } from 'react-router-dom'
import { SafeImage } from '../components/SafeImage'
import { productById } from '../data/products'

export function Mint() {
  const { id } = useParams()
  const product = productById[id]
  if (!product) return <Navigate to="/collections" replace/>

  return <section className="mint page-shell"><div className="mint-visual"><SafeImage src={product.image} alt={product.name}/><span>PROTOTYPE</span></div><div className="mint-copy"><span className="eyebrow">Mint interface · Prototype</span><h1>{product.name}</h1><p>This screen is a non-transactional design preview. Wallet connection, payment, blockchain approval, and asset delivery are not available.</p><div className="wallet panel" aria-label="Prototype transaction summary"><div><span>Listed mint price</span><strong>{product.price.toFixed(1)} ETH</strong></div><div><span>Network concept</span><strong>Ethereum L2</strong></div><button className="button full" disabled>Minting unavailable</button><small className="prototype-note">No wallet request or transaction will occur.</small></div><div className="button-row"><Link className="text-link" to="/collections">← Return to collection</Link></div></div></section>
}
