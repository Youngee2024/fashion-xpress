import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { SafeImage } from '../components/SafeImage'
import { CONCEPT_LICENCES } from '../data/demoCheckout'
import { CONCEPT_NETWORKS, DEMO_WALLET, MINT_STEPS, calculateMintSummary, clearMintDraft, completeDemoMint, deriveMintMetadata, formatDemoUnits, freshMintDraft, getConceptNetwork, readMintAssets, readMintDraft, writeMintDraft } from '../data/demoMint'
import { productById } from '../data/products'

const STEP_LABELS = ['Metadata', 'Demo Wallet', 'Concept network', 'Review', 'Simulation']
const PROGRESS_LABELS = ['Preparing local metadata preview', 'Demonstrating wallet approval', 'Demonstrating contract submission', 'Creating concept asset record', 'Demo complete']
const DISCLOSURES = ['No real wallet is connected.', 'No signature will be requested.', 'No gas fee will be charged.', 'No blockchain transaction will occur.', 'No smart contract will execute.', 'No NFT or token will be created.', 'No ownership or licence will transfer.', 'No asset will be published online.']

function MintSteps({ current }) {
  return <nav className="mint-steps" aria-label="Demo mint steps"><ol>{STEP_LABELS.map((label, index) => <li key={label} aria-current={index === current ? 'step' : undefined}><span>{String(index + 1).padStart(2, '0')}</span>{label}</li>)}</ol></nav>
}

function MetadataPreview({ metadata }) {
  return <div className="mint-metadata panel"><SafeImage src={metadata.product.image} alt={metadata.product.name} width="260" height="340"/><div><dl><div><dt>Title</dt><dd>{metadata.product.name}</dd></div><div><dt>Creator</dt><dd>{metadata.product.creator}</dd></div><div><dt>Concept licence</dt><dd>{CONCEPT_LICENCES.find((item) => item.id === metadata.licence)?.label}</dd></div><div><dt>Edition</dt><dd>{metadata.edition}</dd></div><div><dt>Media type</dt><dd>{metadata.mediaType}</dd></div><div><dt>Local identifier</dt><dd className="demo-identifier">{metadata.identifier}</dd></div></dl><p>{metadata.product.description}</p><ul>{metadata.attributes.map(([name, value]) => <li key={name}><span>{name}</span><strong>{value}</strong></li>)}</ul></div></div>
}

function MintSummary({ summary, licence }) {
  return <div className="mint-summary panel"><dl><div><dt>Concept mint price</dt><dd>{formatDemoUnits(summary.mintUnits)}</dd></div><div><dt>Concept gas estimate</dt><dd>{formatDemoUnits(summary.gasUnits)}</dd></div><div><dt>Concept total</dt><dd>{formatDemoUnits(summary.totalUnits)}</dd></div><div><dt>Concept network</dt><dd>{summary.network.name} · fictional</dd></div><div><dt>Demo Wallet</dt><dd>{DEMO_WALLET.address}</dd></div><div><dt>Concept licence</dt><dd>{CONCEPT_LICENCES.find((item) => item.id === licence)?.label}</dd></div><div><dt>Edition</dt><dd>{summary.metadata.edition}</dd></div></dl><p>All values are fictional demo units with no monetary value.</p></div>
}

export function Mint() {
  const { id } = useParams()
  const product = productById[id]
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const headingRef = useRef(null)
  const completionRef = useRef(false)
  const source = params.get('source')
  const licence = params.get('licence')
  const [draft, setDraft] = useState(() => product ? readMintDraft(id, undefined, { entrySource: source, licence }) : null)
  const [message, setMessage] = useState('')
  const requestedStep = params.get('step')
  const requestedIndex = MINT_STEPS.indexOf(requestedStep)
  const currentIndex = draft ? MINT_STEPS.indexOf(draft.step) : 0
  const metadata = draft ? deriveMintMetadata(id, draft.licence) : null
  const summary = draft ? calculateMintSummary(id, draft.networkId, draft.licence) : null

  useEffect(() => {
    if (!draft || completionRef.current) return
    if (requestedIndex < 0 || requestedIndex > draft.highestStep) setParams({ step: draft.step }, { replace: true })
    else if (requestedStep !== draft.step) setDraft((value) => ({ ...value, step: requestedStep }))
  }, [draft, requestedIndex, requestedStep, setParams])
  useEffect(() => { if (draft && !completionRef.current) writeMintDraft(draft) }, [draft])
  useEffect(() => { headingRef.current?.focus() }, [draft?.step])

  useEffect(() => {
    if (!draft || draft.step !== 'progress') return undefined
    if (draft.progressIndex < 4) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const timer = window.setTimeout(() => setDraft((value) => ({ ...value, progressIndex: value.progressIndex + 1 })), reduced ? 80 : 500)
      return () => window.clearTimeout(timer)
    }
    if (completionRef.current) return undefined
    const timer = window.setTimeout(() => {
      if (completionRef.current) return
      completionRef.current = true
      try {
        completeDemoMint(draft)
        navigate(`/mint/${id}/complete`, { replace: true })
      } catch (error) {
        completionRef.current = false
        setMessage(error.message || 'The local simulation could not be completed.')
      }
    }, 120)
    return () => window.clearTimeout(timer)
  }, [draft, id, navigate])

  if (!product || !draft) return <Navigate to="/collections" replace/>

  function goTo(step) {
    const index = MINT_STEPS.indexOf(step)
    setDraft((value) => ({ ...value, step, highestStep: Math.max(value.highestStep, index) }))
    setParams({ step })
    setMessage(`${STEP_LABELS[index]} ready. This remains a local visual simulation.`)
  }

  function resetWallet() {
    const reset = freshMintDraft(id, { entrySource: draft.entrySource, licence: draft.licence })
    setDraft(reset)
    setParams({ step: 'metadata' }, { replace: true })
    setMessage('Demo Wallet and mint choices reset. Nothing external was affected.')
  }

  function cancelProgress() {
    if (draft.progressIndex >= 4) return
    setDraft((value) => ({ ...value, step: 'review', progressIndex: 0, acknowledged: false }))
    setParams({ step: 'review' }, { replace: true })
    setMessage('Demo mint cancelled safely. Nothing was submitted or created.')
  }

  return <section className="page-shell mint-studio"><span className="eyebrow">Portfolio Demo / Mint Studio</span><h1 ref={headingRef} tabIndex="-1">{STEP_LABELS[currentIndex]}.</h1><p className="mint-intro">A local visual simulation for {product.name}. No wallet, blockchain, contract, or publishing service is connected.</p><p className="mint-entry">Entry: {draft.entrySource === 'checkout' ? 'Digital Wardrobe checkout record' : draft.entrySource === 'vault' ? 'Digital Wardrobe legacy collectible' : draft.entrySource === 'product' ? 'Product detail exploration' : 'Direct Mint Studio exploration'}.</p><MintSteps current={currentIndex}/><p className="sr-status" role="status" aria-live="polite">{message}</p>
    <div className="mint-studio-layout"><div className="mint-studio-main">
      {draft.step === 'metadata' && <><h2>Review local asset metadata</h2><MetadataPreview metadata={metadata}/><p>Metadata is derived from the local product catalogue. It is not uploaded, published, permanent, or immutable.</p><fieldset className="checkout-options"><legend>Concept licence for this demonstration</legend>{CONCEPT_LICENCES.map((item) => <label key={item.id} className={draft.licence === item.id ? 'selected' : ''}><input type="radio" name="mint-licence" checked={draft.licence === item.id} onChange={() => setDraft((value) => ({ ...value, licence: item.id }))}/><span><strong>{item.label}</strong><small>{item.description} No rights are granted.</small></span></label>)}</fieldset></>}
      {draft.step === 'wallet' && <><h2>Activate the fictional Demo Wallet</h2><div className="demo-wallet panel"><span className="eyebrow">Demo Wallet</span><strong>{DEMO_WALLET.address}</strong><p>This is a fixed interface identity, not a cryptocurrency wallet. It requests no permission, signature, password, address, recovery phrase, seed phrase, or private key.</p><p className="wallet-state">Status: <b>{draft.walletActive ? 'Demo Wallet active' : 'Demo Wallet inactive'}</b></p><div className="checkout-controls">{!draft.walletActive ? <button className="button" type="button" onClick={() => { setDraft((value) => ({ ...value, walletActive: true })); setMessage('Demo Wallet activated locally. No wallet permission was requested.') }}>Activate Demo Wallet</button> : <button className="button ghost" type="button" onClick={() => { setDraft((value) => ({ ...value, walletActive: false })); setMessage('Demo Wallet disconnected locally.') }}>Disconnect Demo Wallet</button>}<button className="text-link" type="button" onClick={resetWallet}>Reset Demo Wallet</button></div></div></>}
      {draft.step === 'network' && <><h2>Select a fictional concept network</h2><p>These choices have no chain ID, RPC URL, contract, block data, or live gas feed.</p><fieldset className="mint-networks">{CONCEPT_NETWORKS.map((network) => <label key={network.id} className={draft.networkId === network.id ? 'selected' : ''}><input type="radio" name="concept-network" checked={draft.networkId === network.id} onChange={() => setDraft((value) => ({ ...value, networkId: network.id }))}/><span><strong>{network.name}</strong><small>{network.purpose}</small><small>{network.impact}</small><em>{network.status}</em></span></label>)}</fieldset></>}
      {draft.step === 'review' && <><h2>Review the demo mint</h2><MintSummary summary={summary} licence={draft.licence}/><fieldset className="mint-acknowledgement"><legend>Required acknowledgement</legend><label><input type="checkbox" checked={draft.acknowledged} onChange={(event) => setDraft((value) => ({ ...value, acknowledged: event.target.checked }))}/><span>I understand this is a local visual simulation and acknowledge every statement below.</span></label><ul>{DISCLOSURES.map((item) => <li key={item}>{item}</li>)}</ul></fieldset></>}
      {draft.step === 'progress' && <><h2>Demo mint progress</h2><p>This sequence is a visual simulation. It does not contact a wallet, network, contract, storage service, or marketplace.</p><ol className="mint-progress" aria-label="Visual simulation progress">{PROGRESS_LABELS.map((label, index) => <li key={label} className={index <= draft.progressIndex ? 'active' : ''} aria-current={index === draft.progressIndex ? 'step' : undefined}><span>{index < draft.progressIndex ? 'Complete' : index === draft.progressIndex ? 'Demonstrating' : 'Waiting'}</span><strong>{label}</strong></li>)}</ol>{draft.progressIndex < 4 && <button className="button ghost" type="button" onClick={cancelProgress}>Cancel demo mint</button>}</>}
      {draft.step !== 'progress' && <div className="checkout-controls">{currentIndex > 0 && <button className="button ghost" type="button" onClick={() => goTo(MINT_STEPS[currentIndex - 1])}>Back</button>}{draft.step === 'metadata' && <button className="button" type="button" onClick={() => goTo('wallet')}>Continue to Demo Wallet</button>}{draft.step === 'wallet' && <button className="button" type="button" disabled={!draft.walletActive} onClick={() => goTo('network')}>Continue to network</button>}{draft.step === 'network' && <button className="button" type="button" onClick={() => goTo('review')}>Review demo mint</button>}{draft.step === 'review' && <button className="button" type="button" disabled={!draft.acknowledged || !draft.walletActive} onClick={() => goTo('progress')}>Complete demo mint</button>}<Link className="text-link" to={`/collections/${id}`}>Return to product</Link></div>}
    </div><aside className="mint-studio-summary"><SafeImage src={product.image} alt="" width="360" height="480"/><span className="eyebrow">Current concept</span><h2>{product.name}</h2><p>{getConceptNetwork(draft.networkId).name} · fictional</p><strong>{formatDemoUnits(summary.totalUnits)}</strong><small>No monetary, ownership, scarcity, or blockchain value.</small></aside></div></section>
}

export function MintComplete() {
  const { id } = useParams()
  const navigate = useNavigate()
  const asset = readMintAssets().toReversed().find((item) => item.productId === id)
  const product = productById[id]
  const headingRef = useRef(null)
  useEffect(() => { headingRef.current?.focus() }, [])
  if (!product) return <Navigate to="/collections" replace/>
  if (!asset) return <Navigate to={`/mint/${id}?step=metadata`} replace/>
  const network = getConceptNetwork(asset.networkId)
  const licence = CONCEPT_LICENCES.find((item) => item.id === asset.licence)
  return <section className="page-shell mint-complete"><span className="eyebrow">Local visual simulation</span><h1 ref={headingRef} tabIndex="-1">Demo mint complete.</h1><p role="status" aria-live="polite">Nothing was created on-chain. No wallet connected, contract executed, asset published, payment charged, token created, or ownership transferred.</p><div className="mint-complete-card panel"><SafeImage src={product.image} alt={product.name} width="320" height="420"/><dl><div><dt>Product</dt><dd>{product.name}</dd></div><div><dt>Creator</dt><dd>{product.creator}</dd></div><div><dt>Demo asset ID</dt><dd className="demo-identifier">{asset.assetId}</dd></div><div><dt>Fictional transaction reference</dt><dd className="demo-identifier">{asset.transactionReference}</dd></div><div><dt>Concept network</dt><dd>{network.name} · fictional</dd></div><div><dt>Edition</dt><dd>{asset.edition}</dd></div><div><dt>Concept licence</dt><dd>{licence.label}</dd></div><div><dt>Completion time</dt><dd>{new Date(asset.completedAt).toLocaleString()}</dd></div><div><dt>Status</dt><dd>Not on-chain</dd></div></dl></div><div className="checkout-controls"><Link className="button" to="/digital-wardrobe">View legacy collectible record</Link><Link className="button ghost" to={`/collections/${id}`}>Return to product</Link><Link className="text-link" to="/collections">Explore Collections</Link><button className="text-link" type="button" onClick={() => { clearMintDraft(); navigate(`/mint/${id}?source=vault&step=metadata`) }}>Restart mint demonstration</button></div></section>
}
