import { useCallback, useEffect, useRef } from 'react'
import { Icon } from './Icons'
import { SafeImage } from './SafeImage'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function CartDrawer({ open, items, onClose, onRemove }) {
  const dialogRef = useRef(null)
  const closeRef = useRef(null)
  const previousFocusRef = useRef(null)
  const total = items.reduce((sum, item) => sum + item.price, 0)

  const closeAndRestoreFocus = useCallback(() => {
    const previousFocus = previousFocusRef.current
    onClose()
    window.requestAnimationFrame(() => previousFocus?.focus?.())
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined
    previousFocusRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeAndRestoreFocus()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = [...dialogRef.current.querySelectorAll(FOCUSABLE)]
      if (!focusable.length) {
        event.preventDefault()
        dialogRef.current.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocusRef.current?.focus?.()
    }
  }, [open, onClose, closeAndRestoreFocus])

  if (!open) return null

  return <div className={open ? 'drawer-shell open' : 'drawer-shell'} aria-hidden={!open}>
    <button className="drawer-backdrop" onClick={closeAndRestoreFocus} aria-label="Close shopping bag" tabIndex="-1"/>
    <aside ref={dialogRef} className="drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title" tabIndex="-1">
      <div className="drawer-head"><div><span className="eyebrow">Your edit</span><h2 id="cart-title">Bag ({items.length})</h2></div><button ref={closeRef} className="icon-button" onClick={closeAndRestoreFocus} aria-label="Close shopping bag"><Icon name="close"/></button></div>
      <div className="drawer-items">{items.length === 0 ? <div className="empty" role="status"><Icon name="bag" size={36}/><h3>Your bag is quiet</h3><p>Collect a piece from the latest digital drop.</p></div> : items.map((item, index) => <div className="cart-row" key={`${item.id}-${index}`}><SafeImage src={item.image} alt=""/><div><strong>{item.name}</strong><span>{item.rarity}</span><button onClick={() => onRemove(index)} aria-label={`Remove ${item.name} from bag`}>Remove</button></div><b>{item.price.toFixed(1)} ETH</b></div>)}</div>
      <div className="drawer-total"><div><span>Total</span><strong>{total.toFixed(1)} ETH</strong></div><button className="button full" disabled>Checkout unavailable</button><small>Checkout is not connected. No payment or wallet transaction will occur.</small></div>
    </aside>
  </div>
}
