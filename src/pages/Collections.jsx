import { useMemo, useState } from 'react'
import { Newsletter } from '../components/Layout'
import { ProductCard } from '../components/ProductCard'
import { products } from '../data/products'

const filters = ['All', 'Limited', 'Rare', 'Ultra Rare']

export function Collections({ onAdd }) {
  const [filter, setFilter] = useState('All')
  const [sort, setSort] = useState('featured')
  const shown = useMemo(() => products
    .filter((product) => filter === 'All' || product.rarity === filter)
    .sort((a, b) => sort === 'low' ? a.price - b.price : sort === 'high' ? b.price - a.price : b.score - a.score), [filter, sort])

  return <>
    <section className="collection-hero page-shell"><div><span className="eyebrow">Collection 01 · Genesis</span><h1>Digital pieces.<br/><em>Singular presence.</em></h1><p>Six limited-edition garments that exist beyond the constraints of cloth, gravity, and geography.</p></div><span className="edition-mark">FX<br/>/01</span></section>
    <section className="page-shell collection-body"><div className="filter-bar"><div role="group" aria-label="Filter collection by rarity">{filters.map((name) => <button className={filter === name ? 'active' : ''} onClick={() => setFilter(name)} aria-pressed={filter === name} key={name}>{name}</button>)}</div><label>Sort <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label></div><p className="result-count" role="status" aria-live="polite">{shown.length} pieces</p>{shown.length ? <div className="product-grid">{shown.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd}/>)}</div> : <div className="empty-state"><h2>No pieces match this edit.</h2><p>Reset the rarity filter to see the complete Genesis collection.</p><button className="button ghost" onClick={() => setFilter('All')}>Show all pieces</button></div>}</section>
    <div className="page-shell"><Newsletter/></div>
  </>
}
