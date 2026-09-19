import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthState'
import { hasErrors, validateNewsletter } from '../data/formValidation'
import { IS_DEMO_MODE } from '../data/appMode'
import { runWorkflow } from '../data/workflowApi'
import { useWorkflowAvailability } from '../hooks/useWorkflowAvailability'
import { Icon } from './Icons'
import { FieldError } from './PrototypeUI'
import { ConsentField, Honeypot, PortfolioDemoIndicator, ServiceStatus } from './WorkflowUI'

const links = [['/', 'Home'], ['/collections', 'Collections'], ['/ar-tryon', 'Virtual try-on'], ['/community', 'Community'], ['/about', 'About']]

export function Header({ cartCount, onCartOpen }) {
  const auth = useAuth()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return undefined
    const closeOnEscape = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [open])
  return <header className="site-header"><Link className="brand" to="/"><span>FX</span> FashionXpress</Link><button className="icon-button mobile-menu" onClick={() => setOpen(!open)} aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="primary-navigation"><Icon name={open ? 'close' : 'menu'} /></button><nav id="primary-navigation" className={open ? 'nav-links open' : 'nav-links'} aria-label="Main navigation">{links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}</nav><div className="header-actions"><Link className="account-link" to={auth.profile ? `/profile/${auth.profile.handle}` : auth.user ? '/profile/setup' : '/auth?next=%2Fcommunity'} aria-label={auth.profile ? `Your profile, ${auth.profile.display_name}` : 'Community sign-in'}>{auth.profile ? `@${auth.profile.handle}` : auth.mode === 'demo' ? 'Demo entry' : 'Sign in'}</Link><button className="cart-button" onClick={onCartOpen} aria-label={`Open bag with ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}><Icon name="bag"/>{cartCount > 0 && <span>{cartCount}</span>}</button><Link className="button small" to="/get-started">Creator atelier <Icon name="arrow" size={16}/></Link></div></header>
}

export function Footer() {
  return <footer><div><Link className="brand" to="/"><span>FX</span> FashionXpress</Link><p>Where culture, code, and couture converge—in a portfolio prototype.</p></div><div><h4>Explore</h4><Link to="/collections">Collections</Link><Link to="/ar-tryon">Virtual try-on</Link><Link to="/community">Community</Link></div><div><h4>Company</h4><Link to="/about">About us</Link><Link to="/contact">Contact</Link><Link to="/get-started">Creator atelier</Link></div><div><h4>Information</h4><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/community-guidelines">Community guidelines</Link><Link to="/licensing">Licensing</Link><Link to="/refund-policy">Purchase status</Link><Link to="/accessibility">Accessibility</Link></div><div className="footer-bottom"><span>© 2026 FashionXpress · Portfolio concept</span><span>Lagos · London · Everywhere</span></div></footer>
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
  const demoMessage = 'Demo complete—your email was not subscribed.'
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [website, setWebsite] = useState('')
  const [errors, setErrors] = useState({})
  const [stage, setStage] = useState('editing')
  const [message, setMessage] = useState('')
  const startedAt = useRef(Date.now())
  const submitting = useRef(false)
  const availability = useWorkflowAvailability()

  async function submit(event) {
    event.preventDefault()
    if (submitting.current || availability !== 'available') return
    const nextErrors = validateNewsletter({ email, consent })
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) return
    submitting.current = true
    setStage('submitting')
    const response = await runWorkflow({ endpoint: '/api/newsletter/subscribe', payload: { email, consent, website, startedAt: startedAt.current }, demoMessage })
    submitting.current = false
    setMessage(response.message)
    if (response.ok) {
      if (!response.demo) {
        setEmail('')
        setConsent(false)
        setWebsite('')
      }
      setStage('complete')
    } else {
      if (response.fields) setErrors(response.fields)
      setStage('error')
    }
  }

  function reset() {
    setEmail('')
    setConsent(false)
    setWebsite('')
    startedAt.current = Date.now()
    setStage('editing')
    setMessage('')
    setErrors({})
  }

  return <section className="newsletter panel"><div><span className="eyebrow">The front row</span><h2>Stay ahead of the drop.</h2><p>{IS_DEMO_MODE ? 'Try the signup flow. No email will be subscribed in this portfolio demo.' : 'Opt in to occasional collection and creator updates. Confirmation is required.'}</p></div>{stage === 'complete' ? <div className="newsletter-result" role="status" aria-live="polite"><Icon name="check"/><h3>{IS_DEMO_MODE ? demoMessage : 'Check your inbox.'}</h3><p>{IS_DEMO_MODE ? 'No request was sent and your email was not saved. Select Done to clear your entry.' : message}</p><button className="text-link" type="button" onClick={reset}>{IS_DEMO_MODE ? 'Done — clear entry' : 'Use another address'}</button></div> : <form noValidate onSubmit={submit} aria-busy={stage === 'submitting'}><ServiceStatus status={availability} noun="newsletter signup"/>{stage === 'error' && <p className="form-message error" role="alert">{message}</p>}<fieldset disabled={availability !== 'available' || stage === 'submitting'}><label htmlFor="newsletter-email">Email address</label><input id="newsletter-email" name="email" maxLength="254" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'newsletter-error newsletter-note' : 'newsletter-note'} type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => { setEmail(event.target.value); if (errors.email) setErrors((current) => ({ ...current, email: '' })) }}/><FieldError id="newsletter-error">{errors.email}</FieldError><ConsentField id="newsletter-consent" checked={consent} onChange={(event) => { setConsent(event.target.checked); if (errors.consent) setErrors((current) => ({ ...current, consent: '' })) }} error={errors.consent}>I want to receive FashionXpress email updates.</ConsentField><Honeypot prefix="newsletter" value={website} onChange={(event) => setWebsite(event.target.value)}/><div className="workflow-action"><button className="button" type="submit" disabled={availability !== 'available' || stage === 'submitting'}>{stage === 'submitting' ? (IS_DEMO_MODE ? 'Completing demo…' : 'Requesting confirmation…') : <>Join the front row <Icon name="arrow" size={16}/></>}</button>{IS_DEMO_MODE && <PortfolioDemoIndicator/>}</div><small id="newsletter-note" className="prototype-note">{IS_DEMO_MODE ? 'Demo only: no request, email, or database record is created.' : 'Supabase stores consent status; Resend sends confirmation and manages the mailing contact.'}</small></fieldset></form>}</section>
}
