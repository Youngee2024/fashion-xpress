import { useCallback, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { cartSnapshot, calculateDemoTotal, formatConceptUnits } from '../data/demoCheckout'
import { Icon } from './Icons'
import { SafeImage } from './SafeImage'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function CartDrawer({ open, items, onClose, onRemove, onQuantityChange }) {
  const dialogRef = useRef(null)
  const closeRef = useRef(null)
  const previousFocusRef = useRef(null)
  const itemCount = items.reduce((sum, entry) => sum + entry.quantity, 0)
  const subtotal = items.length ? calculateDemoTotal(cartSnapshot(items).map((item) => ({ ...item, licence: 'personal' }))).subtotalUnits : 0

  const closeAndRestoreFocus = useCallback(() => {
    const previousFocus = previousFocusRef.current
    onClose()
    window.setTimeout(() => previousFocus?.focus?.(), 0)
  }, [onClose])
  const closeForNavigation = useCallback(() => {
    previousFocusRef.current = null
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined
    previousFocusRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); closeAndRestoreFocus(); return }
      if (event.key !== 'Tab') return
      const focusable = [...dialogRef.current.querySelectorAll(FOCUSABLE)]
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => { document.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = previousOverflow; previousFocusRef.current?.focus?.() }
  }, [open, closeAndRestoreFocus])

  if (!open) return null
  return <div className="drawer-shell open"><button className="drawer-backdrop" onClick={closeAndRestoreFocus} aria-label="Close shopping bag" tabIndex="-1"/><aside ref={dialogRef} className="drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title" aria-describedby="cart-description" tabIndex="-1"><div className="drawer-head"><div><span className="eyebrow">Your local edit</span><h2 id="cart-title">Bag ({itemCount})</h2><p id="cart-description" className="sr-only">A local demo bag. Checkout makes no payment, order, ownership transfer, or blockchain transaction.</p></div><button ref={closeRef} className="icon-button" onClick={closeAndRestoreFocus} aria-label="Close shopping bag"><Icon name="close"/></button></div><div className="drawer-items" aria-live="polite">{items.length === 0 ? <div className="empty"><Icon name="bag" size={36}/><h3>Your bag is quiet</h3><p>Collect a concept piece to explore the checkout demonstration.</p><Link className="button ghost" to="/collections" onClick={closeForNavigation}>Browse collection</Link></div> : items.map(({ product, quantity }) => <div className="cart-row" key={product.id}><SafeImage src={product.image} alt="" width="140" height="184"/><div className="cart-item-copy"><strong>{product.name}</strong><span>{product.creator}</span><span>{formatConceptUnits(product.priceUnits)} each</span><div className="quantity-control" role="group" aria-label={`Quantity for ${product.name}`}><button onClick={() => onQuantityChange(product.id, -1)} aria-label={`Decrease ${product.name} quantity`}><Icon name="minus" size={14}/></button><output aria-label={`${product.name} quantity`}>{quantity}</output><button onClick={() => onQuantityChange(product.id, 1)} disabled={quantity >= 99} aria-label={`Increase ${product.name} quantity`}><Icon name="plus" size={14}/></button></div><button className="remove-item" onClick={() => onRemove(product.id)} aria-label={`Remove ${product.name} from bag`}>Remove</button></div><b>{formatConceptUnits(product.priceUnits * quantity)}</b></div>)}</div><div className="drawer-total"><div><span>Demo subtotal</span><strong>{formatConceptUnits(subtotal)}</strong></div>{items.length ? <Link className="button full" to="/checkout?step=bag" onClick={closeForNavigation}>Proceed to demo checkout</Link> : <button className="button full" disabled>Proceed to demo checkout</button>}<small>No payment was taken. No order was placed. No wallet was connected. This journey also creates no ownership, licence, or blockchain transaction.</small></div></aside></div>
}
