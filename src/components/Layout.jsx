import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Icon } from './Icons'

const links = [['/', 'Home'], ['/collections', 'Collections'], ['/ar-tryon', 'AR Try-on'], ['/community', 'Community'], ['/about', 'About']]

export function Header({ cartCount, onCartOpen }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [open])

  return <header className="site-header">
    <Link className="brand" to="/"><span>FX</span> FashionXpress</Link>
    <button className="icon-button mobile-menu" onClick={() => setOpen(!open)} aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="primary-navigation"><Icon name={open ? 'close' : 'menu'} /></button>
    <nav id="primary-navigation" className={open ? 'nav-links open' : 'nav-links'} aria-label="Main navigation">{links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}</nav>
    <div className="header-actions"><button className="cart-button" onClick={onCartOpen} aria-label={`Open bag with ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}><Icon name="bag"/>{cartCount > 0 && <span>{cartCount}</span>}</button><Link className="button small" to="/get-started">Get started <Icon name="arrow" size={16}/></Link></div>
  </header>
}

export function Footer() {
  return <footer><div><Link className="brand" to="/"><span>FX</span> FashionXpress</Link><p>Where culture, code, and couture converge.</p></div><div><h4>Explore</h4><Link to="/collections">Collections</Link><Link to="/ar-tryon">Virtual try-on</Link><Link to="/community">Community</Link></div><div><h4>Company</h4><Link to="/about">About us</Link><Link to="/contact">Contact</Link><Link to="/get-started">Become a creator</Link></div><div className="footer-bottom"><span>© 2026 FashionXpress</span><span>Lagos · London · Everywhere</span></div></footer>
}

export function Layout({ children, cartCount, onCartOpen }) {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      window.requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView())
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname, hash])
  return <><a className="skip-link" href="#main-content">Skip to main content</a><Header cartCount={cartCount} onCartOpen={onCartOpen}/><main id="main-content" tabIndex="-1">{children}</main><Footer/></>
}

export function SectionHeading({ eyebrow, title, copy, align = 'left' }) {
  return <div className={`section-heading ${align === 'center' ? 'center' : ''}`}><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{copy && <p>{copy}</p>}</div>
}

export function Newsletter() {
  return <section className="newsletter panel"><div><span className="eyebrow">The front row</span><h2>Stay ahead of the drop.</h2><p>New collections, creative tools, and digital fashion stories—delivered with restraint.</p></div><form onSubmit={(event) => event.preventDefault()}><input aria-label="Email address" disabled type="email" placeholder="Email address"/><button className="button" type="submit" disabled>Mailing list coming soon</button><small className="prototype-note">Signup is not yet connected. No email address is collected.</small></form></section>
}
