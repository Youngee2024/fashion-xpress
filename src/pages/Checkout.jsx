import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthState'
import { SafeImage } from '../components/SafeImage'
import { formatNaira } from '../data/commercePricing'
import { CHECKOUT_STEPS, DEMO_CUSTOMERS, DIGITAL_USE_LICENCES, calculateDemoTotal, cartSignature, clearCheckoutDraft, completeDemoCheckout, readCheckoutDraft, readDemoCollection, receiptSummary, selectionsFromCart, writeCheckoutDraft } from '../data/demoCheckout'

const DISCLOSURE = ['No real payment will be taken.', 'No real order will be created.', 'No digital-use licence will be transferred.', 'No personal information will be transmitted.']
const STEP_LABELS = ['Bag review', 'Digital-use licences', 'Digital access details', 'Demo payment', 'Order review']

function Disclosure() {
  return <aside className="checkout-disclosure" aria-label="Demo checkout limitations"><strong>Portfolio Demo — no transaction</strong><ul>{DISCLOSURE.map((line) => <li key={line}>{line}</li>)}</ul></aside>
}

function ItemList({ lines, editable = false, onQuantityChange, onRemove }) {
  return <div className="checkout-items">{lines.map(({ product, productTitle, quantity, licence, baseUnitPriceKobo, licensedUnitPriceKobo, lineTotalKobo }) => <article className="checkout-item" key={product.id}><Link to={`/collections/${product.id}`} aria-label={`View ${productTitle ?? product.name}`}><SafeImage src={product.image} alt="" width="140" height="184"/></Link><div><h3><Link to={`/collections/${product.id}`}>{productTitle ?? product.name}</Link></h3><p>Creator: {product.creator}</p><p>Starting price: {formatNaira(baseUnitPriceKobo)} each</p>{!editable && <p>Digital-use licence: {licence.label} · {formatNaira(licensedUnitPriceKobo)} each</p>}{editable ? <div className="checkout-quantity" role="group" aria-label={`Quantity for ${product.name}`}><button type="button" onClick={() => onQuantityChange(product.id, -1)} aria-label={`Decrease ${product.name} quantity`}>−</button><output aria-label={`${product.name} quantity`}>{quantity}</output><button type="button" onClick={() => onQuantityChange(product.id, 1)} disabled={quantity >= 99} aria-label={`Increase ${product.name} quantity`}>+</button><button type="button" className="text-link" onClick={() => onRemove(product.id)}>Remove</button></div> : <span>Quantity: {quantity}</span>}</div><strong>{formatNaira(lineTotalKobo)}</strong></article>)}</div>
}

function Totals({ summary }) {
  return <dl className="checkout-totals"><div><dt>Items subtotal</dt><dd>{formatNaira(summary.subtotalKobo)}</dd></div><div><dt>Licence adjustments</dt><dd>{formatNaira(summary.adjustmentKobo)}</dd></div><div className="checkout-grand-total"><dt>Final demo total</dt><dd>{formatNaira(summary.totalKobo)}</dd></div></dl>
}

export function Checkout({ cart, onQuantityChange, onRemove, onCompleted }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const preferredCustomer = auth.mode === 'demo' && auth.profile ? 'runway-guest' : 'guest-customer'
  const [draft, setDraft] = useState(() => readCheckoutDraft(cart, undefined, preferredCustomer))
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
    if (!completionRef.current && draft.signature !== cartKey) setDraft(readCheckoutDraft(cart, undefined, preferredCustomer))
  }, [cart, cartKey, draft.signature, preferredCustomer])
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

  return <section className="page-shell checkout-page"><span className="eyebrow">Portfolio Demo / Naira checkout</span><h1 ref={headingRef} tabIndex="-1">{STEP_LABELS[currentIndex]}.</h1><p className="checkout-intro">Explore a Naira-priced digital-fashion checkout and choose a digital-use licence. This remains a local interface demonstration, not a purchase.</p><nav className="checkout-steps" aria-label="Checkout steps"><ol>{STEP_LABELS.map((label, index) => <li key={label} aria-current={index === currentIndex ? 'step' : undefined}><span>{String(index + 1).padStart(2, '0')}</span>{label}</li>)}</ol></nav><p className="sr-status" role="status" aria-live="polite">{message}</p>
    {!cart.length ? <div className="panel checkout-empty"><h2>Your bag is empty.</h2><p>Choose a digital-fashion piece to begin the local Naira checkout demonstration. Existing Digital Wardrobe records remain available separately.</p><Link className="button" to="/collections">Explore Collections</Link><Link className="text-link" to="/digital-wardrobe">View Digital Wardrobe</Link></div> : <div className="checkout-layout"><div className="checkout-main">
      {step === 'bag' && <><h2>Review your pieces</h2><ItemList lines={summary.lines} editable onQuantityChange={onQuantityChange} onRemove={onRemove}/><p className="checkout-note">Your bag restores after refresh and stores product identifiers and quantities only—never prices or payment details.</p></>}
      {step === 'licence' && <><h2>Choose your digital-use licence</h2><p>This is the central checkout choice. Prices use the approved Naira uplifts, but every licence structure remains illustrative and no legal licence is transferred. See the <Link className="text-link" to="/licensing">Licensing page</Link> for more context.</p>{summary.lines.map(({ product }) => <fieldset className="checkout-options licence-options" key={product.id}><legend>{product.name}</legend>{DIGITAL_USE_LICENCES.map((licence) => <label key={licence.id} className={(draft.licences[product.id] ?? 'personal') === licence.id ? 'selected' : ''}><input type="radio" name={`licence-${product.id}`} checked={(draft.licences[product.id] ?? 'personal') === licence.id} onChange={() => setDraft((value) => ({ ...value, licences: { ...value.licences, [product.id]: licence.id } }))}/><span><strong>{licence.label} <em>{licence.adjustmentPercent ? `Base price + ${licence.adjustmentPercent}%` : 'Base price'}</em></strong><small>{licence.description}</small><ul>{licence.permissions.map((permission) => <li key={permission}>{permission}</li>)}</ul></span></label>)}</fieldset>)}</>}
      {step === 'ownership' && <><h2>Digital access details</h2><p>Choose a demo customer profile for the local Wardrobe record. No shipping address, real name, email, or phone number is needed or transmitted.</p><fieldset className="checkout-options"><legend>Demo customer profile</legend>{DEMO_CUSTOMERS.map((customer) => <label key={customer.id} className={draft.owner === customer.id ? 'selected' : ''}><input type="radio" name="demo-customer" checked={draft.owner === customer.id} onChange={() => setDraft((value) => ({ ...value, owner: customer.id }))}/><span><strong>{customer.label}</strong><small>{customer.description}</small></span></label>)}</fieldset></>}
      {step === 'payment' && <><h2>Demo Naira payment</h2><div className="demo-payment-card" aria-label="Fictional Naira payment demonstration"><span>NGN / DEMO</span><strong>{formatNaira(summary.totalKobo)}</strong><small>No payment details · Portfolio demonstration only</small></div><p>There are no card, bank, password, billing, or OTP fields. Nothing is sent to a payment provider.</p><Disclosure/></>}
      {step === 'review' && <><h2>Review your demo order</h2><ItemList lines={summary.lines}/><p>Demo customer profile: {DEMO_CUSTOMERS.find((customer) => customer.id === draft.owner)?.label}</p><Disclosure/></>}
      <div className="checkout-controls">{currentIndex > 0 && <button className="button ghost" type="button" onClick={back}>Back to {STEP_LABELS[currentIndex - 1].toLowerCase()}</button>}{step === 'review' ? <button className="button" type="button" onClick={complete} disabled={completing}>{completing ? 'Completing local demo…' : 'Complete demo order'}</button> : <button className="button" type="button" onClick={next}>{step === 'payment' ? 'Continue to order review' : 'Continue'}</button>}<Link className="text-link" to="/collections" onClick={continueShopping}>Continue shopping</Link></div>
    </div><aside className="checkout-summary panel"><span className="eyebrow">Your Naira demo total</span><Totals summary={summary}/><p>Fixed Naira demonstration prices. No payment, real order, or licence transfer occurs.</p></aside></div>}
  </section>
}

export function CheckoutComplete({ onRestart }) {
  const navigate = useNavigate()
  const receipts = readDemoCollection()
  const receipt = receipts.at(-1)
  const headingRef = useRef(null)
  useEffect(() => { headingRef.current?.focus() }, [])
  if (!receipt) return <Navigate to="/checkout?step=bag" replace/>
  const summary = receiptSummary(receipt)
  return <section className="page-shell checkout-page checkout-complete"><span className="eyebrow">Portfolio Demo / order confirmation</span><h1 ref={headingRef} tabIndex="-1">Demo order confirmation.</h1><p role="status" aria-live="polite">No real payment was taken. No real order was created. No legal digital-use licence was transferred. No personal information was transmitted.</p><div className="panel"><p><strong>Demo order reference:</strong> {receipt.reference}</p><p><strong>Date:</strong> {new Date(receipt.completedAt).toLocaleString()}</p><ItemList lines={summary.lines}/><Totals summary={summary}/></div><Disclosure/><div className="checkout-controls"><Link className="button" to="/digital-wardrobe">View Digital Wardrobe</Link><Link className="button ghost" to="/collections">Return to Collections</Link><button className="text-link" onClick={() => { onRestart(receipt.items); navigate('/checkout?step=bag') }}>Restart demo checkout</button></div></section>
}
