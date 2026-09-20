import { useMemo, useState } from 'react'
import { Icon } from '../components/Icons'
import { Newsletter } from '../components/Layout'
import { EmptyState, PrototypeNotice } from '../components/PrototypeUI'
import { ProductCard } from '../components/ProductCard'
import { RELEASE_TIERS, selectProducts } from '../data/products'

const filters = ['All releases', 'Limited Release', 'Signature Release', 'Atelier Release']

export function Collections({ onAdd }) {
  const [filter, setFilter] = useState('All releases')
  const [sort, setSort] = useState('featured')
  const [query, setQuery] = useState('')
  const shown = useMemo(() => selectProducts({ filter, query, sort }), [filter, query, sort])

  function browseAll() {
    setFilter('All releases')
    setQuery('')
    setSort('featured')
  }

  return <>
    <section className="collection-hero page-shell"><div><span className="eyebrow">Collection 01 · Genesis</span><h1>Digital pieces.<br/><em>Singular presence.</em></h1><p>Nine digital-fashion pieces with clear Naira pricing, planned licence allocations, and release tiers.</p></div><span className="edition-mark">FX<br/>/01</span></section>
    <section className="page-shell collection-body"><div className="collection-tools"><label className="collection-search"><span>Find a piece</span><span className="search-input"><Icon name="search" size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the collection"/></span></label><div className="filter-bar"><div role="group" aria-label="Filter collection by release tier">{filters.map((name) => <button className={filter === name ? 'active' : ''} onClick={() => setFilter(name)} aria-pressed={filter === name} key={name}>{name}</button>)}</div><label>Sort <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Featured order</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label></div></div><div className="collection-summary"><p className="result-count" role="status" aria-live="polite">{shown.length} {shown.length === 1 ? 'piece' : 'pieces'}</p><PrototypeNotice compact>Naira values are fixed starting prices. Planned allocations are illustrative and are not live inventory. No real payment, order, or licence transfer occurs.</PrototypeNotice></div><details className="release-tier-guide"><summary>What release tiers mean</summary><div>{RELEASE_TIERS.map((tier) => <p key={tier.id}><strong>{tier.id}</strong>{tier.description}</p>)}</div></details>{shown.length ? <><h2 className="sr-only">Genesis collection pieces</h2><div className="product-grid">{shown.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd}/>)}</div></> : <EmptyState title="No pieces match this edit." actions={<><button className="button ghost" onClick={() => setQuery('')}>Reset search</button><button className="button" onClick={browseAll}>Browse all pieces</button></>}>Try a different term, reset the search, or return to the complete Genesis collection.</EmptyState>}</section>
    <div className="page-shell"><Newsletter/></div>
  </>
}
