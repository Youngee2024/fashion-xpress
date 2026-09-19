import { useMemo, useState } from 'react'
import { Icon } from '../components/Icons'
import { Newsletter } from '../components/Layout'
import { EmptyState, PrototypeNotice } from '../components/PrototypeUI'
import { ProductCard } from '../components/ProductCard'
import { products } from '../data/products'

const filters = ['All', 'Limited', 'Rare', 'Ultra Rare']

export function Collections({ onAdd }) {
  const [filter, setFilter] = useState('All')
  const [sort, setSort] = useState('featured')
  const [query, setQuery] = useState('')
  const shown = useMemo(() => {
    const filtered = products.filter((product) => (filter === 'All' || product.rarity === filter) && `${product.name} ${product.description}`.toLowerCase().includes(query.trim().toLowerCase()))
    if (sort === 'low') return filtered.sort((a, b) => a.price - b.price)
    if (sort === 'high') return filtered.sort((a, b) => b.price - a.price)
    return filtered
  }, [filter, query, sort])

  function browseAll() {
    setFilter('All')
    setQuery('')
    setSort('featured')
  }

  return <>
    <section className="collection-hero page-shell"><div><span className="eyebrow">Collection 01 · Genesis</span><h1>Digital pieces.<br/><em>Singular presence.</em></h1><p>Six limited-edition concept garments imagined beyond the constraints of cloth, gravity, and geography.</p></div><span className="edition-mark">FX<br/>/01</span></section>
    <section className="page-shell collection-body"><div className="collection-tools"><label className="collection-search"><span>Find a piece</span><span className="search-input"><Icon name="search" size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the collection"/></span></label><div className="filter-bar"><div role="group" aria-label="Filter collection by rarity">{filters.map((name) => <button className={filter === name ? 'active' : ''} onClick={() => setFilter(name)} aria-pressed={filter === name} key={name}>{name}</button>)}</div><label>Sort <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Featured order</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label></div></div><div className="collection-summary"><p className="result-count" role="status" aria-live="polite">{shown.length} {shown.length === 1 ? 'piece' : 'pieces'}</p><PrototypeNotice compact>ETH values are fixed concept prices for interface demonstration. They are not live exchange rates or offers to sell.</PrototypeNotice></div>{shown.length ? <><h2 className="sr-only">Genesis collection pieces</h2><div className="product-grid">{shown.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd}/>)}</div></> : <EmptyState title="No pieces match this edit." actions={<><button className="button ghost" onClick={() => setQuery('')}>Reset search</button><button className="button" onClick={browseAll}>Browse all pieces</button></>}>Try a different term, reset the search, or return to the complete Genesis collection.</EmptyState>}</section>
    <div className="page-shell"><Newsletter/></div>
  </>
}
