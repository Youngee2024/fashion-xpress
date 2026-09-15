import { Icon } from './Icons'

export function PrototypeNotice({ title = 'Portfolio prototype', children, compact = false }) {
  return <aside className={`prototype-banner ${compact ? 'compact' : ''}`} aria-label={title}>
    <Icon name="spark" size={16}/>
    <div><strong>{title}</strong><p>{children}</p></div>
  </aside>
}

export function FieldError({ id, children }) {
  if (!children) return null
  return <span className="field-error" id={id}><Icon name="close" size={13}/>{children}</span>
}

export function DemoComplete({ title, children, onReset }) {
  return <div className="demo-complete panel" role="status" aria-live="polite" tabIndex="-1">
    <Icon name="check" size={34}/>
    <span className="eyebrow">Prototype complete</span>
    <h2>{title}</h2>
    <p>{children}</p>
    {onReset && <button className="button ghost" type="button" onClick={onReset}>Start again</button>}
  </div>
}

export function EmptyState({ title, children, actions }) {
  return <div className="empty-state" role="status"><Icon name="spark" size={26}/><h2>{title}</h2><p>{children}</p>{actions && <div className="empty-actions">{actions}</div>}</div>
}
