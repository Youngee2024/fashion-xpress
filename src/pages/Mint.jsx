import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { productById } from '../data/products'

export function Mint() {
  const { id }=useParams(); const product=productById[id]; const [approved,setApproved]=useState(false); const [progress,setProgress]=useState(0)
  useEffect(()=>{ if(!approved || progress>=100) return; const timer=setInterval(()=>setProgress((value)=>Math.min(100,value+4)),80); return()=>clearInterval(timer)},[approved,progress])
  if(!product) return <Navigate to="/collections" replace/>
  return <section className="mint page-shell"><div className="mint-visual"><img src={product.image} alt={product.name}/><div className={approved && progress<100 ? 'scan active' : 'scan'}/><span>{String(progress).padStart(3,'0')}%</span></div><div className="mint-copy"><span className="eyebrow">Minting station</span><h1>{progress===100 ? 'Piece secured.' : product.name}</h1><p>{progress===100 ? 'This digital edition is now ready for your vault.' : 'Confirm this simulated wallet request to construct your edition metadata.'}</p>{progress===100 ? <div className="mint-success"><Icon name="check" size={30}/><div><span>Edition verified</span><b>FX-{id.toUpperCase()}-{Date.now().toString().slice(-4)}</b></div></div> : <div className="wallet panel"><div><span>Mint price</span><strong>{product.price.toFixed(1)} ETH</strong></div><div><span>Estimated gas</span><strong>0.0042 ETH</strong></div><div><span>Network</span><strong>Ethereum L2</strong></div><button className="button full" onClick={()=>setApproved(true)} disabled={approved}>{approved ? `Constructing metadata · ${progress}%` : 'Approve & mint'}</button></div>}<div className="button-row"><Link className="text-link" to="/collections">← Return to collection</Link>{progress===100 && <button className="button">View in vault <Icon name="arrow" size={16}/></button>}</div></div></section>
}
