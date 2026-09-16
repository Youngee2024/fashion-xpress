import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthState'
import { Icon } from '../components/Icons'
import { EmptyState, FieldError, PrototypeNotice } from '../components/PrototypeUI'
import { COMMUNITY_CATEGORIES, hasValidationErrors, validateDiscussion } from '../data/communityRules'
import { resetDemoCommunity, useCommunityStore } from '../hooks/useCommunityStore'

export function CommunityDate({ value }) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : <time dateTime={value} title={date.toLocaleString()}>{date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</time>
}

export function AuthorLink({ author }) {
  return author?.handle ? <Link to={`/profile/${author.handle}`}>@{author.handle}</Link> : <span>Deleted member</span>
}

export function Community() {
  const auth = useAuth()
  const store = useCommunityStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [stage, setStage] = useState('loading')
  const [searchDraft, setSearchDraft] = useState('')
  const [filters, setFilters] = useState({ search: '', category: '', sort: 'newest' })
  const [page, setPage] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [composer, setComposer] = useState(false)
  const [draft, setDraft] = useState({ title: '', body: '', category: 'General' })
  const [errors, setErrors] = useState({})
  const [posting, setPosting] = useState(false)
  const postingRef = useRef(false)
  const [message, setMessage] = useState(location.state?.announcement ?? '')
  const titleRef = useRef(null)
  const composerOpenedRef = useRef(false)

  useEffect(() => {
    if (!location.state?.announcement) return
    const heading = document.querySelector('.feed-title h2')
    heading?.setAttribute('tabindex', '-1')
    heading?.focus()
  }, [location.state])

  useEffect(() => {
    if (composer) {
      composerOpenedRef.current = true
      titleRef.current?.focus({ preventScroll: true })
      document.getElementById('discussion-composer')?.scrollIntoView({ block: 'start', behavior: 'instant' })
    } else if (composerOpenedRef.current) {
      composerOpenedRef.current = false
      window.setTimeout(() => document.querySelector('.community-actions button[aria-controls="discussion-composer"]')?.focus(), 0)
    }
  }, [composer])
  useEffect(() => {
    if (!store) { setStage('unavailable'); return undefined }
    let active = true
    store.list({ ...filters, page }).then((result) => {
      if (!active) return
      setItems((current) => page === 0 ? result.items : [...current, ...result.items])
      setTotal(result.total); setHasMore(result.hasMore); setStage('ready')
    }).catch(() => { if (active) setStage(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error') })
    return () => { active = false }
  }, [store, filters, page, reloadKey])

  const refresh = useCallback(() => { setPage(0); setReloadKey((key) => key + 1) }, [])
  function updateFilters(next) { setStage('loading'); setPage(0); setFilters((current) => ({ ...current, ...next })) }
  function requireIdentity() {
    if (auth.user && auth.profile) return true
    if (auth.user) navigate('/profile/setup?next=%2Fcommunity')
    else navigate('/auth?next=%2Fcommunity')
    return false
  }
  async function like(item) {
    if (!requireIdentity()) return
    try { await store.toggleLike(item.id, auth.user.id, item.liked); setMessage(auth.mode === 'demo' ? 'Local like updated. Nothing was published online.' : 'Like updated.'); refresh() }
    catch { setMessage('The like could not be updated. Nothing changed; retry when connected.') }
  }
  async function publish(event) {
    event.preventDefault()
    if (postingRef.current || !requireIdentity()) return
    const nextErrors = validateDiscussion(draft)
    setErrors(nextErrors)
    if (hasValidationErrors(nextErrors)) { setMessage('Review the highlighted discussion fields.'); titleRef.current?.focus(); return }
    postingRef.current = true; setPosting(true); setMessage('')
    try {
      const created = await store.createDiscussion(draft, auth.user.id)
      setDraft({ title: '', body: '', category: 'General' }); setComposer(false); setPosting(false); postingRef.current = false
      navigate(`/community/${created.id}`, { state: { announcement: auth.mode === 'demo' ? 'Local demo discussion created. It was not published online.' : 'Discussion published.' } })
    } catch { postingRef.current = false; setPosting(false); setMessage('The discussion could not be posted. Your draft is still here; retry when connected.') }
  }
  function resetDemo() { resetDemoCommunity(); auth.resetDemoProfile(); setComposer(false); setDraft({ title: '', body: '', category: 'General' }); setMessage('Demo Community reset. No online content was affected.'); refresh() }

  return <>
    <section className="community-hero page-shell"><span className="eyebrow">{auth.mode === 'demo' ? 'Local Community demo' : 'Community'}</span><h1>Ideas look better<br/><em>in company.</em></h1><p>{auth.mode === 'demo' ? 'Explore fictional conversations and try a complete local Community journey.' : 'Read and join published digital-fashion conversations.'}</p>{auth.mode === 'demo' && <PrototypeNotice compact>Demo posts, replies, likes, and reports stay in this browser tab. Nothing is published or sent to a Community service.</PrototypeNotice>}{auth.mode === 'live' && !auth.configured && <p role="alert" className="service-status unavailable">Live Community is not configured on this deployment. No demo data will be substituted.</p>}<div className="community-actions">{!auth.user ? <Link className="button" to="/auth?next=%2Fcommunity">{auth.mode === 'demo' ? 'Enter Demo Community' : 'Sign in to participate'}</Link> : <button className="button" onClick={() => setComposer((open) => !open)} aria-expanded={composer} aria-controls="discussion-composer"><Icon name="plus" size={17}/> {composer ? 'Close composer' : 'Start a discussion'}</button>}{auth.mode === 'demo' && <button className="button ghost" onClick={resetDemo}>Reset demo community</button>}{auth.profile && <Link className="text-link" to={`/profile/${auth.profile.handle}`}>View your profile</Link>}</div></section>
    {composer && <section className="page-shell"><form id="discussion-composer" className="composer panel" onSubmit={publish} noValidate aria-busy={posting}><div><span className="eyebrow">{auth.mode === 'demo' ? 'Local discussion preview' : 'New discussion'}</span><button type="button" className="icon-button" onClick={() => setComposer(false)} aria-label="Close discussion composer"><Icon name="close"/></button></div>{auth.mode === 'demo' && <PrototypeNotice compact>This discussion appears only in the current browser tab and is not published online.</PrototypeNotice>}<label>Discussion title<input ref={titleRef} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength="120" aria-invalid={Boolean(errors.title)}/></label><FieldError>{errors.title}</FieldError><label>Category<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{COMMUNITY_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label><label>Discussion body<textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} maxLength="5000" rows="5" aria-invalid={Boolean(errors.body)}/></label><FieldError>{errors.body}</FieldError><small>Plain text only; no links, markup, or embeds.</small><button className="button" disabled={posting}>{posting ? 'Posting…' : auth.mode === 'demo' ? 'Add local discussion' : 'Publish discussion'}</button></form></section>}
    <p className="sr-status" role="status" aria-live="polite">{message}</p>
    <section id="community-feed" className="page-shell community-layout"><div><div className="feed-title"><div><span className="eyebrow">{auth.mode === 'demo' ? 'Demonstration feed' : 'Published feed'}</span><h2>Latest discussions</h2></div><span>{total} {total === 1 ? 'conversation' : 'conversations'}</span></div><div className="community-filter-row"><form role="search" onSubmit={(event) => { event.preventDefault(); updateFilters({ search: searchDraft.trim() }) }}><label className="search"><span className="sr-only">Search discussions</span><Icon name="search"/><input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Search discussions" maxLength="80"/></label><button type="submit">Search</button></form><label>Category<select value={filters.category} onChange={(event) => updateFilters({ category: event.target.value })}><option value="">All</option>{COMMUNITY_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label><label>Sort<select value={filters.sort} onChange={(event) => updateFilters({ sort: event.target.value })}><option value="newest">Newest</option><option value="active">Most active</option><option value="liked">Most liked</option></select></label></div>{stage === 'loading' && <div className="community-skeleton" role="status" aria-label="Loading discussions"><span/><span/><span/></div>}{stage === 'unavailable' && <p role="alert">Live Community configuration is unavailable.</p>}{['error', 'offline'].includes(stage) && <div role="alert" className="panel community-error"><h3>{stage === 'offline' ? 'You are offline.' : 'Discussions could not load.'}</h3><p>No demo content has been substituted for live data.</p><button className="button ghost" onClick={refresh}>Retry</button></div>}{stage === 'ready' && <div className="thread-list">{items.length ? items.map((item) => <article className="thread" key={item.id}><div className={`avatar avatar-${item.author?.avatar_id ?? 'acid'}`} aria-hidden="true">{item.author?.display_name?.[0] ?? 'F'}</div><div><div className="thread-meta"><AuthorLink author={item.author}/><CommunityDate value={item.created_at}/><i>{item.category}</i>{item.edited_at && <span>Edited</span>}</div><h3><Link to={`/community/${item.id}`}>{item.title}</Link></h3><p>{item.body.length > 220 ? `${item.body.slice(0, 220)}…` : item.body}</p><div className="thread-actions"><Link to={`/community/${item.id}`}>{item.reply_count} {item.reply_count === 1 ? 'reply' : 'replies'}</Link><button onClick={() => like(item)} aria-pressed={Boolean(item.liked)} aria-label={`${item.liked ? 'Unlike' : 'Like'} ${item.title}`}><Icon name="heart" size={16}/> {item.like_count}</button></div></div></article>) : <EmptyState title="No conversations found." actions={<button className="button ghost" onClick={() => { setSearchDraft(''); updateFilters({ search: '', category: '' }) }}>Clear filters</button>}>Try a different search or category.</EmptyState>}{hasMore && <button className="button ghost load-more" onClick={() => { setStage('loading'); setPage((current) => current + 1) }}>Load more discussions</button>}</div>}</div><aside className="community-side"><div className="side-card"><span className="eyebrow">Community guidelines</span><h3>Make room for ideas.</h3><p>Respect creators. Do not post harassment, hate, spam, private data, or unsafe content.</p><Link className="text-link" to="/community-guidelines">Read guidelines →</Link></div><div className="side-card resources"><h3>Creator resources</h3><Link to="/get-started">Creator atelier <span>→</span></Link><Link to="/licensing">Licensing concept <span>→</span></Link><Link to="/about#values">Community values <span>→</span></Link></div></aside></section>
  </>
}
