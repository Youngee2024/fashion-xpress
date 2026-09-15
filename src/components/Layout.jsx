import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Icon } from './Icons'
import { DemoComplete, FieldError } from './PrototypeUI'

const links = [['/', 'Home'], ['/collections', 'Collections'], ['/ar-tryon', 'AR concept'], ['/community', 'Community'], ['/about', 'About']]

export function Header({ cartCount, onCartOpen }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return undefined
    const closeOnEscape = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [open])

  return <header className="site-header">
    <Link className="brand" to="/"><span>FX</span> FashionXpress</Link>
    <button className="icon-button mobile-menu" onClick={() => setOpen(!open)} aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="primary-navigation"><Icon name={open ? 'close' : 'menu'} /></button>
    <nav id="primary-navigation" className={open ? 'nav-links open' : 'nav-links'} aria-label="Main navigation">{links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}</nav>
    <div className="header-actions"><button className="cart-button" onClick={onCartOpen} aria-label={`Open bag with ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}><Icon name="bag"/>{cartCount > 0 && <span>{cartCount}</span>}</button><Link className="button small" to="/get-started">Creator atelier <Icon name="arrow" size={16}/></Link></div>
  </header>
}

export function Footer() {
  return <footer><div><Link className="brand" to="/"><span>FX</span> FashionXpress</Link><p>Where culture, code, and couture converge—in a portfolio prototype.</p></div><div><h4>Explore</h4><Link to="/collections">Collections</Link><Link to="/ar-tryon">AR concept</Link><Link to="/community">Community</Link></div><div><h4>Company</h4><Link to="/about">About us</Link><Link to="/contact">Contact</Link><Link to="/get-started">Creator atelier</Link></div><div><h4>Information</h4><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/licensing">Licensing</Link><Link to="/refund-policy">Purchase status</Link><Link to="/accessibility">Accessibility</Link></div><div className="footer-bottom"><span>© 2026 FashionXpress · Portfolio concept</span><span>Lagos · London · Everywhere</span></div></footer>
}

export function Layout({ children, cartCount, onCartOpen }) {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) window.requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView())
    else window.scrollTo(0, 0)
  }, [pathname, hash])
  return <><a className="skip-link" href="#main-content">Skip to main content</a><Header cartCount={cartCount} onCartOpen={onCartOpen}/><main id="main-content" tabIndex="-1">{children}</main><Footer/></>
}

export function SectionHeading({ eyebrow, title, copy, align = 'left' }) {
  return <div className={`section-heading ${align === 'center' ? 'center' : ''}`}><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{copy && <p>{copy}</p>}</div>
}

export function Newsletter() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)

  function submit(event) {
    event.preventDefault()
    const nextError = !email.trim() ? 'Enter an email address to complete the demo.' : !/^\S+@\S+\.\S+$/.test(email) ? 'Enter an email address in a valid format.' : ''
    setError(nextError)
    if (!nextError) setComplete(true)
  }

  return <section className="newsletter panel"><div><span className="eyebrow">The front row</span><h2>Stay ahead of the drop.</h2><p>Explore how a future collection-update flow could feel.</p></div>{complete ? <DemoComplete title="You completed the signup demo." onReset={() => { setComplete(false); setEmail('') }}>No email address was transmitted or added to a mailing list.</DemoComplete> : <form noValidate onSubmit={submit}><label htmlFor="newsletter-email">Email address</label><input id="newsletter-email" aria-invalid={Boolean(error)} aria-describedby={error ? 'newsletter-error newsletter-note' : 'newsletter-note'} type="email" placeholder="you@example.com" value={email} onChange={(event) => { setEmail(event.target.value); if (error) setError('') }}/><FieldError id="newsletter-error">{error}</FieldError><button className="button" type="submit">Complete signup demo <Icon name="arrow" size={16}/></button><small id="newsletter-note" className="prototype-note">Portfolio prototype—no subscription or external request occurs.</small></form>}</section>
}
