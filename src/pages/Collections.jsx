import { useMemo, useState } from 'react'
import { Newsletter } from '../components/Layout'
import { ProductCard } from '../components/ProductCard'
import { products } from '../data/products'

export function Collections({ onAdd }) {
  const [filter, setFilter] = useState('All'); const [sort, setSort] = useState('featured')
  const shown = useMemo(() => products.filter((p) => filter === 'All' || p.rarity === filter).sort((a,b) => sort === 'low' ? a.price-b.price : sort === 'high' ? b.price-a.price : b.score-a.score), [filter, sort])
  return <><section className="collection-hero page-shell"><div><span className="eyebrow">Collection 01 · Genesis</span><h1>Digital pieces.<br/><em>Singular presence.</em></h1><p>Six limited-edition garments that exist beyond the constraints of cloth, gravity, and geography.</p></div><span className="edition-mark">FX<br/>/01</span></section><section className="page-shell collection-body"><div className="filter-bar"><div>{['All','Limited','Rare','Ultra Rare'].map((name) => <button className={filter === name ? 'active' : ''} onClick={() => setFilter(name)} key={name}>{name}</button>)}</div><label>Sort <select value={sort} onChange={(e) => setSort(e.target.value)}><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label></div><p className="result-count">{shown.length} pieces</p><div className="product-grid">{shown.map((p) => <ProductCard key={p.id} product={p} onAdd={onAdd}/>)}</div>{!shown.length && <p className="empty">No pieces match this edit.</p>}</section><div className="page-shell"><Newsletter/></div></>
}
