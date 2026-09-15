import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { PrototypeNotice } from '../components/PrototypeUI'
import { SafeImage } from '../components/SafeImage'
import { productById } from '../data/products'

const stages = ['Review', 'Confirm concept', 'Complete']

export function Mint() {
  const { id } = useParams()
  const product = productById[id]
  const [stage, setStage] = useState(0)
  const [previewId] = useState(() => `FX-DEMO-${id.toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`)
  if (!product) return <Navigate to="/collections" replace/>

  return <section className="mint page-shell"><div className="mint-visual"><SafeImage priority width="900" height="1350" src={product.image} alt={product.name}/><span>EXPERIENCE PROTOTYPE</span></div><div className="mint-copy"><span className="eyebrow">Minting experience prototype</span><h1>{product.name}</h1><p className="mint-price">{product.price.toFixed(1)} ETH <small>Concept price</small></p><PrototypeNotice compact>No wallet is connected. No payment, blockchain request, token, or ownership record can be created here.</PrototypeNotice><ol className="prototype-steps" aria-label="Minting prototype stages">{stages.map((name, index) => <li key={name} className={index === stage ? 'active' : index < stage ? 'complete' : ''} aria-current={index === stage ? 'step' : undefined}><b>{index < stage ? '✓' : `0${index + 1}`}</b><span>{name}</span></li>)}</ol>{stage === 0 && <div className="wallet panel"><h2>Review the concept listing</h2><div><span>Piece</span><strong>{product.name}</strong></div><div><span>Edition concept</span><strong>1 of {product.stock}</strong></div><div><span>Network concept</span><strong>Ethereum L2</strong></div><p>This information demonstrates hierarchy only and is not an offer to transact.</p><button className="button full" onClick={() => setStage(1)}>Continue prototype <Icon name="arrow" size={16}/></button></div>}{stage === 1 && <div className="wallet panel prototype-confirm"><h2>Confirm the demonstration</h2><ul><li><Icon name="check"/> I understand no wallet will connect.</li><li><Icon name="check"/> I understand no payment will occur.</li><li><Icon name="check"/> I understand no token will be created.</li></ul><button className="button full" onClick={() => setStage(2)}>Complete guided demo</button><button className="text-link" onClick={() => setStage(0)}>Back to review</button></div>}{stage === 2 && <div className="mint-success" role="status" aria-live="polite"><Icon name="check" size={30}/><div><span>Concept complete · Nothing transmitted</span><b>{previewId}</b><p>This stable session identifier is for interface demonstration only. It is not a token or transaction ID.</p></div></div>}<div className="button-row"><Link className="text-link" to="/collections">← Return to collection</Link>{stage === 2 && <button className="button ghost" onClick={() => setStage(0)}>Restart prototype</button>}</div></div></section>
}
