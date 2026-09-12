import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Icon } from './Icons'

const links = [['/', 'Home'], ['/collections', 'Collections'], ['/ar-tryon', 'AR Try-on'], ['/community', 'Community'], ['/about', 'About']]

export function Header({ cartCount, onCartOpen }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  return <header className="site-header"><Link className="brand" to="/"><span>FX</span> FashionXpress</Link><button className="icon-button mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle navigation"><Icon name={open ? 'close' : 'menu'} /></button><nav className={open ? 'nav-links open' : 'nav-links'} aria-label="Main navigation">{links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}</nav><div className="header-actions"><button className="cart-button" onClick={onCartOpen} aria-label={`Open bag with ${cartCount} items`}><Icon name="bag"/><span>{cartCount}</span></button><Link className="button small" to="/get-started">Get started <Icon name="arrow" size={16}/></Link></div></header>
}

export function Footer() {
  return <footer><div><Link className="brand" to="/"><span>FX</span> FashionXpress</Link><p>Where culture, code, and couture converge.</p></div><div><h4>Explore</h4><Link to="/collections">Collections</Link><Link to="/ar-tryon">Virtual try-on</Link><Link to="/community">Community</Link></div><div><h4>Company</h4><Link to="/about">About us</Link><Link to="/contact">Contact</Link><Link to="/get-started">Become a creator</Link></div><div className="footer-bottom"><span>© 2026 FashionXpress</span><span>Lagos · London · Everywhere</span></div></footer>
}

export function Layout({ children, cartCount, onCartOpen }) {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return <><Header cartCount={cartCount} onCartOpen={onCartOpen}/><main>{children}</main><Footer/></>
}

export function SectionHeading({ eyebrow, title, copy, align = 'left' }) { return <div className={`section-heading ${align === 'center' ? 'center' : ''}`}><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{copy && <p>{copy}</p>}</div> }

export function Newsletter() {
  const [email, setEmail] = useState(''); const [sent, setSent] = useState(false)
  function submit(event) { event.preventDefault(); setSent(true); setEmail('') }
  return <section className="newsletter panel"><div><span className="eyebrow">The front row</span><h2>Stay ahead of the drop.</h2><p>New collections, creative tools, and digital fashion stories—delivered with restraint.</p></div><form onSubmit={submit}>{sent ? <p className="success"><Icon name="check"/> You’re on the list.</p> : <><input aria-label="Email address" required type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)}/><button className="button" type="submit">Join the list <Icon name="arrow" size={16}/></button></>}</form></section>
}
