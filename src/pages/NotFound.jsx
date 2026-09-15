import { Link } from 'react-router-dom'
import { Icon } from '../components/Icons'

export function NotFound() {
  return <section className="not-found page-shell"><span aria-hidden="true">404</span><p className="eyebrow">Route not found</p><h1>Off the runway.</h1><p>That page doesn’t exist in this collection. Choose a familiar path below.</p><div className="button-row"><Link className="button" to="/">Home <Icon name="arrow" size={16}/></Link><Link className="button ghost" to="/collections">Collections</Link><Link className="text-link" to="/community">Community →</Link></div></section>
}
