import { Link } from 'react-router-dom'
import { Icon } from './Icons'

export function ServiceStatus({ status, noun = 'submission' }) {
  if (status === 'available') return null
  return <div className={`service-status ${status}`} role="status">
    <Icon name={status === 'checking' ? 'spark' : 'close'} size={16}/>
    <span>{status === 'checking' ? `Checking secure ${noun} service…` : `Online ${noun}s are not configured on this deployment.`}</span>
  </div>
}

export function PortfolioDemoIndicator() {
  return <span className="portfolio-demo-indicator">Portfolio Demo</span>
}

export function ConsentField({ id, checked, onChange, error, children }) {
  return <div className="consent-field">
    <label htmlFor={id}><input id={id} name="consent" type="checkbox" checked={checked} onChange={onChange} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}/><span>{children} Read the <Link to="/privacy">Privacy notice</Link>.</span></label>
    {error && <span className="field-error" id={`${id}-error`}><Icon name="close" size={13}/>{error}</span>}
  </div>
}

export function Honeypot({ value, onChange, prefix }) {
  return <div className="honeypot" aria-hidden="true"><label htmlFor={`${prefix}-website`}>Website<input id={`${prefix}-website`} name="website" value={value} onChange={onChange} tabIndex="-1" autoComplete="off"/></label></div>
}

export function SubmissionSuccess({ title, reference, notification, children, onReset, demo = false }) {
  return <div className="demo-complete panel workflow-success" role="status" aria-live="polite" tabIndex="-1">
    <Icon name="check" size={34}/><span className="eyebrow">{demo ? 'Portfolio Demo' : 'Securely received'}</span><h2>{title}</h2><p>{children}</p>
    {reference && <p className="submission-reference"><span>Reference</span><strong>{reference}</strong></p>}
    {notification === 'pending' && <p className="delivery-note">Your submission is stored. The email notification is delayed; you do not need to resubmit.</p>}
    {onReset && <button className="button ghost" type="button" onClick={onReset}>{demo ? 'Done — clear entries' : 'Send another'}</button>}
  </div>
}
