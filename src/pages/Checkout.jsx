import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthState'
import { SafeImage } from '../components/SafeImage'
import { CHECKOUT_STEPS, CONCEPT_LICENCES, DEMO_OWNERS, calculateDemoTotal, cartSignature, clearCheckoutDraft, completeDemoCheckout, formatConceptUnits, readCheckoutDraft, readDemoCollection, resetDemoCollection, selectionsFromCart, writeCheckoutDraft } from '../data/demoCheckout'

const DISCLOSURE = ['No payment will be taken.', 'No real order will be created.', 'No digital ownership or licence will be transferred.', 'No blockchain transaction will occur.', 'No personal information will be transmitted.']
const STEP_LABELS = ['Bag review', 'Digital identity', 'Concept licences', 'Payment demo', 'Final review']

function Disclosure() { return <aside className="checkout-disclosure" aria-label="Demo checkout limitations"><strong>Portfolio Demo — no transaction</strong><ul>{DISCLOSURE.map((line) => <li key={line}>{line}</li>)}</ul></aside> }

function ItemList({ lines, editable = false, onQuantityChange, onRemove }) {
  return <div className="checkout-items">{lines.map(({ product, quantity, licence, baseUnits, adjustmentUnits }) => <article className="checkout-item" key={product.id}><Link to={`/collections/${product.id}`} aria-label={`View ${product.name}`}><SafeImage src={product.image} alt="" width="140" height="184"/></Link><div><h3><Link to={`/collections/${product.id}`}>{product.name}</Link></h3><p>Creator: {product.creator}</p><p>{formatConceptUnits(product.priceUnits)} each</p>{!editable && <p>Concept licence: {licence.label}</p>}{editable ? <div className="checkout-quantity" role="group" aria-label={`Quantity for ${product.name}`}><button type="button" onClick={() => onQuantityChange(product.id, -1)} aria-label={`Decrease ${product.name} quantity`}>−</button><output aria-label={`${product.name} quantity`}>{quantity}</output><button type="button" onClick={() => onQuantityChange(product.id, 1)} disabled={quantity >= 99} aria-label={`Increase ${product.name} quantity`}>+</button><button type="button" className="text-link" onClick={() => onRemove(product.id)}>Remove</button></div> : <span>Quantity: {quantity}</span>}</div><strong>{formatConceptUnits(baseUnits + adjustmentUnits)}</strong></article>)}</div>
}

function Totals({ summary }) { return <dl className="checkout-totals"><div><dt>Items subtotal</dt><dd>{formatConceptUnits(summary.subtotalUnits)}</dd></div><div><dt>Demo licence adjustments</dt><dd>{formatConceptUnits(summary.adjustmentUnits)}</dd></div><div className="checkout-grand-total"><dt>Final demo total</dt><dd>{formatConceptUnits(summary.totalUnits)}</dd></div></dl> }

export function Checkout({ cart, onQuantityChange, onRemove, onCompleted }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const preferredOwner = auth.mode === 'demo' && auth.profile ? 'runway-guest' : 'guest-collector'
  const [draft, setDraft] = useState(() => readCheckoutDraft(cart, undefined, preferredOwner))
  const [message, setMessage] = useState('')
  const [completing, setCompleting] = useState(false)
  const completionRef = useRef(false)
  const headingRef = useRef(null)
  const cartKey = cartSignature(cart)
  const requestedStep = params.get('step') ?? 'bag'
  const requestedIndex = CHECKOUT_STEPS.indexOf(requestedStep)
  const currentIndex = requestedIndex >= 0 && requestedIndex <= draft.highestStep && cart.length ? requestedIndex : 0
  const step = CHECKOUT_STEPS[currentIndex]
  const summary = cart.length ? calculateDemoTotal(selectionsFromCart(cart, draft.licences)) : null

  useEffect(() => {
    if (!completionRef.current && draft.signature !== cartKey) setDraft(readCheckoutDraft(cart, undefined, preferredOwner))
  }, [cart, cartKey, draft.signature, preferredOwner])
  useEffect(() => {
    if (draft.signature === cartKey) writeCheckoutDraft(draft)
  }, [cartKey, draft])
  useEffect(() => {
    if (!completionRef.current && requestedStep !== step) setParams({ step }, { replace: true })
  }, [requestedStep, step, setParams])
  useEffect(() => { headingRef.current?.focus() }, [step])

  function next() {
    if (!cart.length) { setMessage('Add a piece before continuing.'); return }
    const index = currentIndex + 1
    setDraft((value) => ({ ...value, highestStep: Math.max(value.highestStep, index) }))
    setMessage(`${STEP_LABELS[index]} ready. No transaction is taking place.`)
    setParams({ step: CHECKOUT_STEPS[index] })
  }

  function back() { setMessage(''); setParams({ step: CHECKOUT_STEPS[Math.max(0, currentIndex - 1)] }) }
  function continueShopping(event) {
    if (currentIndex > 0 && !window.confirm('Leave this demo checkout? Your non-personal step choices will remain in this browser tab.')) event.preventDefault()
  }

  function complete() {
    if (completionRef.current || completing) return
    completionRef.current = true
    setCompleting(true)
    setMessage('Saving this local demonstration…')
    try {
      const receipt = completeDemoCheckout(cart, draft)
      onCompleted(receipt.items)
      clearCheckoutDraft()
      navigate('/checkout/complete', { replace: true })
    } catch (error) {
      completionRef.current = false
      setCompleting(false)
      setMessage(error.message || 'The demo could not be completed. Your bag has not changed.')
    }
  }

  return <section className="page-shell checkout-page"><span className="eyebrow">Portfolio Demo / checkout</span><h1 ref={headingRef} tabIndex="-1">{STEP_LABELS[currentIndex]}.</h1><p className="checkout-intro">Explore how digital-fashion checkout could feel. This is a local interface demonstration, not a purchase.</p><nav className="checkout-steps" aria-label="Checkout steps"><ol>{STEP_LABELS.map((label, index) => <li key={label} aria-current={index === currentIndex ? 'step' : undefined}><span>{String(index + 1).padStart(2, '0')}</span>{label}</li>)}</ol></nav><p className="sr-status" role="status" aria-live="polite">{message}</p>
    {!cart.length ? <div className="panel checkout-empty"><h2>Your bag is empty.</h2><p>Choose a digital-fashion concept piece to begin the local checkout demonstration. Existing Demo Collection pieces remain available separately.</p><Link className="button" to="/collections">Explore Collections</Link><Link className="text-link" to="/demo-collection">View Demo Collection</Link></div> : <div className="checkout-layout"><div className="checkout-main">
      {step === 'bag' && <><h2>Review your pieces</h2><ItemList lines={summary.lines} editable onQuantityChange={onQuantityChange} onRemove={onRemove}/><p className="checkout-note">Your bag restores after refresh and stores product identifiers and quantities only.</p></>}
      {step === 'ownership' && <><h2>Choose a fictional identity</h2><p>No shipping address, real name, email, or phone number is needed. This identity is for the interface journey only and is never submitted.</p><fieldset className="checkout-options"><legend>Demo identity</legend>{DEMO_OWNERS.map((owner) => <label key={owner.id} className={draft.owner === owner.id ? 'selected' : ''}><input type="radio" name="demo-owner" checked={draft.owner === owner.id} onChange={() => setDraft((value) => ({ ...value, owner: owner.id }))}/><span><strong>{owner.label}</strong><small>{owner.description}</small></span></label>)}</fieldset></>}
      {step === 'licence' && <><h2>Explore concept licences</h2><p>These descriptions are illustrative, not legally active licences. See the <Link className="text-link" to="/licensing">Licensing page</Link> for the current prototype status. Adjustments are rounded to the nearest 0.1 concept ETH per piece.</p>{summary.lines.map(({ product }) => <fieldset className="checkout-options" key={product.id}><legend>{product.name}</legend>{CONCEPT_LICENCES.map((licence) => <label key={licence.id} className={(draft.licences[product.id] ?? 'personal') === licence.id ? 'selected' : ''}><input type="radio" name={`licence-${product.id}`} checked={(draft.licences[product.id] ?? 'personal') === licence.id} onChange={() => setDraft((value) => ({ ...value, licences: { ...value.licences, [product.id]: licence.id } }))}/><span><strong>{licence.label} <em>+{licence.adjustmentPercent}%</em></strong><small>{licence.description}</small></span></label>)}</fieldset>)}</>}
      {step === 'payment' && <><h2>Demo payment method</h2><div className="demo-payment-card" aria-label="Fictional demo payment card"><span>FX / DEMO</span><strong>No payment details</strong><small>Portfolio demonstration only</small></div><p>There are no card, bank, wallet, password, billing, or OTP fields. Nothing is sent to a payment provider.</p><Disclosure/></>}
      {step === 'review' && <><h2>Review the demonstration</h2><ItemList lines={summary.lines}/><p>Fictional identity: {DEMO_OWNERS.find((owner) => owner.id === draft.owner)?.label}</p><Disclosure/></>}
      <div className="checkout-controls">{currentIndex > 0 && <button className="button ghost" type="button" onClick={back}>Back to {STEP_LABELS[currentIndex - 1].toLowerCase()}</button>}{step === 'review' ? <button className="button" type="button" onClick={complete} disabled={completing}>{completing ? 'Completing local demo…' : 'Complete demo checkout'}</button> : <button className="button" type="button" onClick={next}>{step === 'payment' ? 'Continue to final review' : 'Continue'}</button>}<Link className="text-link" to="/collections" onClick={continueShopping}>Continue shopping</Link></div>
    </div><aside className="checkout-summary panel"><span className="eyebrow">Your demo total</span><Totals summary={summary}/><p>Concept amounts only. No payment, order, ownership, or licence transfer.</p></aside></div>}</section>
}

export function CheckoutComplete({ onRestart }) {
  const navigate = useNavigate()
  const receipts = readDemoCollection()
  const receipt = receipts.at(-1)
  const headingRef = useRef(null)
  useEffect(() => { headingRef.current?.focus() }, [])
  if (!receipt) return <Navigate to="/checkout?step=bag" replace/>
  const summary = calculateDemoTotal(receipt.items)
  return <section className="page-shell checkout-page checkout-complete"><span className="eyebrow">Portfolio Demo / receipt</span><h1 ref={headingRef} tabIndex="-1">Demo checkout complete.</h1><p role="status" aria-live="polite">No payment was taken. No real order was created. No digital ownership or licence was transferred.</p><div className="panel"><p><strong>Local demo reference:</strong> {receipt.reference}</p><p><strong>Date:</strong> {new Date(receipt.completedAt).toLocaleString()}</p><ItemList lines={summary.lines}/><Totals summary={summary}/></div><Disclosure/><div className="checkout-controls"><Link className="button" to="/demo-collection">View Demo Collection</Link><Link className="button ghost" to="/collections">Return to Collections</Link><button className="text-link" onClick={() => { onRestart(receipt.items); navigate('/checkout?step=bag') }}>Restart demo checkout</button></div></section>
}

export function DemoCollection() {
  const [receipts, setReceipts] = useState(() => readDemoCollection())
  const [message, setMessage] = useState('')
  function reset() { resetDemoCollection(); setReceipts([]); setMessage('Demo Collection reset. No online or owned items were affected.') }
  return <section className="page-shell checkout-page demo-vault"><span className="eyebrow">Local portfolio demonstration</span><h1>Demo Collection.</h1><p>These pieces are not owned, minted, licensed, or stored online. They have no monetary or blockchain value. This view contains only local demo records for this browser tab.</p><p role="status" aria-live="polite">{message}</p>{receipts.length ? <><div className="checkout-controls"><button className="button ghost" onClick={() => { if (window.confirm('Reset this local Demo Collection?')) reset() }}>Reset Demo Collection</button><Link className="text-link" to="/collections">Explore Collections</Link></div>{receipts.toReversed().map((receipt) => <section className="vault-group panel" key={receipt.token}><h2>{receipt.reference}</h2><p>{new Date(receipt.completedAt).toLocaleDateString()} · Concept total: {formatConceptUnits(calculateDemoTotal(receipt.items).totalUnits)}</p><ItemList lines={calculateDemoTotal(receipt.items).lines}/></section>)}</> : <div className="panel checkout-empty"><h2>No demo pieces yet.</h2><p>Complete a local checkout demonstration to preview pieces here. Corrupted or unavailable session data is discarded safely.</p><Link className="button" to="/collections">Find a concept piece</Link></div>}</section>
}
