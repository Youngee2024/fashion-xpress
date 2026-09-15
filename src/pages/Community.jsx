import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { EmptyState, FieldError, PrototypeNotice } from '../components/PrototypeUI'

const seed = [
  { id: 1, title: 'How do I price my first digital collection?', author: 'DigitalDesigner', category: 'Marketplace', replies: 24, likes: 42, time: '2h', text: 'I’m launching ten pieces and weighing rarity, craft, and market comparison. What has worked for other creators?' },
  { id: 2, title: 'Blender vs Maya for fashion design', author: '3DArtist', category: 'Tools', replies: 18, likes: 37, time: '5h', text: 'Making the shift from physical to digital fashion. I’d love perspectives from artists with garment workflows in both.' },
  { id: 3, title: 'My “Neon Dreams” collection is live', author: 'LunaCouture', category: 'Showcase', replies: 56, likes: 89, time: '1d', text: 'Six months of work, reactive materials, and a lot of iteration. Sharing the complete collection concept for feedback.' },
  { id: 4, title: 'Making L2 concepts legible for creators', author: 'CryptoCreator', category: 'Technology', replies: 42, likes: 67, time: '2d', text: 'A design discussion about explaining networks, fees, and ownership without making a prototype feel transactional.' },
]

export function Community() {
  const [threads, setThreads] = useState(seed)
  const [query, setQuery] = useState('')
  const [liked, setLiked] = useState([])
  const [composer, setComposer] = useState(false)
  const [draft, setDraft] = useState({ title: '', text: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('')
  const titleRef = useRef(null)
  const shown = useMemo(() => threads.filter((thread) => `${thread.title} ${thread.author} ${thread.category}`.toLowerCase().includes(query.trim().toLowerCase())), [threads, query])

  useEffect(() => { if (composer) titleRef.current?.focus() }, [composer])

  function toggleLike(id) {
    const thread = threads.find((item) => item.id === id)
    const isLiked = liked.includes(id)
    setLiked((current) => isLiked ? current.filter((likedId) => likedId !== id) : [...current, id])
    setThreads((current) => current.map((item) => item.id === id ? { ...item, likes: item.likes + (isLiked ? -1 : 1) } : item))
    setStatus(`${isLiked ? 'Removed local like from' : 'Added local like to'} ${thread.title}. Nothing was published.`)
  }

  function previewDiscussion(event) {
    event.preventDefault()
    const nextErrors = {
      title: draft.title.trim().length < 8 ? 'Use at least 8 characters for a clear title.' : '',
      text: draft.text.trim().length < 20 ? 'Use at least 20 characters to develop the discussion.' : '',
    }
    setErrors(nextErrors)
    if (nextErrors.title || nextErrors.text) {
      setStatus('The local preview needs more detail. Your draft has been preserved.')
      const firstInvalid = nextErrors.title ? titleRef.current : document.getElementById('discussion-body')
      firstInvalid?.focus()
      return
    }
    setThreads((current) => [{ id: Date.now(), title: draft.title, text: draft.text, author: 'You', category: 'Local preview', replies: 0, likes: 0, time: 'now', local: true }, ...current])
    setDraft({ title: '', text: '' })
    setErrors({})
    setComposer(false)
    setStatus('Discussion added to this local preview. It was not published online.')
  }

  return <>
    <section className="community-hero page-shell"><span className="eyebrow">Local community prototype</span><h1>Ideas look better<br/><em>in company.</em></h1><p>Explore demonstration conversations and preview local-only community interactions.</p><PrototypeNotice compact>Posts and likes reset when this page session ends. Nothing is published or sent to a community service.</PrototypeNotice><div className="community-actions"><label className="search"><span className="sr-only">Search demonstration conversations</span><Icon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search demo conversations"/></label><button className="button" onClick={() => setComposer((current) => !current)} aria-expanded={composer} aria-controls="discussion-composer"><Icon name="plus" size={17}/> {composer ? 'Close composer' : 'Create local preview'}</button></div></section>
    {composer && <section className="page-shell"><form id="discussion-composer" className="composer panel" noValidate onSubmit={previewDiscussion}><div><span className="eyebrow">Local discussion preview</span><button type="button" className="icon-button" onClick={() => setComposer(false)} aria-label="Close discussion composer"><Icon name="close"/></button></div><PrototypeNotice compact>This draft appears only in the current page session and is never published online.</PrototypeNotice>{(errors.title || errors.text) && <div className="error-summary" role="alert">Review the highlighted fields. Your draft is still here.</div>}<label>Discussion title<input ref={titleRef} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'discussion-title-error' : undefined} value={draft.title} onChange={(event) => { setDraft({ ...draft, title: event.target.value }); setErrors({ ...errors, title: '' }) }}/></label><FieldError id="discussion-title-error">{errors.title}</FieldError><label>Discussion body<textarea id="discussion-body" aria-invalid={Boolean(errors.text)} aria-describedby={errors.text ? 'discussion-body-error' : undefined} rows="4" value={draft.text} onChange={(event) => { setDraft({ ...draft, text: event.target.value }); setErrors({ ...errors, text: '' }) }}/></label><FieldError id="discussion-body-error">{errors.text}</FieldError><button className="button" type="submit">Add to local preview</button></form></section>}
    <p className="sr-status" role="status" aria-live="polite">{status}</p>
    <section id="community-feed" className="page-shell community-layout"><div><div className="feed-title"><div><span className="eyebrow">{query ? 'Search results' : 'Demonstration feed'}</span><h2>{query ? `Results for “${query}”` : 'Latest discussions'}</h2></div><span>{shown.length} conversations</span></div><div className="thread-list">{shown.length ? shown.map((thread) => <article className="thread" key={thread.id}><div className="avatar" aria-hidden="true">{thread.author[0]}</div><div><div className="thread-meta"><strong>@{thread.author}</strong><span>{thread.time}</span><i>{thread.category}</i><span className="thread-state">{thread.local ? 'Added locally' : 'Demo content'}</span></div><h3>{thread.title}</h3><p>{thread.text}</p><div className="thread-actions"><span aria-label={`${thread.replies} demonstration replies`}>◯ {thread.replies} replies</span><button className={liked.includes(thread.id) ? 'liked' : ''} onClick={() => toggleLike(thread.id)} aria-pressed={liked.includes(thread.id)} aria-label={`${liked.includes(thread.id) ? 'Unlike' : 'Like'} ${thread.title} locally`}><Icon name="heart" size={16}/> {thread.likes}</button></div></div></article>) : <EmptyState title="No conversations found." actions={<button className="button ghost" onClick={() => setQuery('')}>Clear search</button>}>Try another phrase or return to the full demonstration feed.</EmptyState>}</div></div><aside className="community-side"><div className="side-card"><span className="eyebrow">Event concept</span><h3>Virtual Fashion Week</h3><p>A visual example of how a future community event could be presented.</p><b>DEMONSTRATION DATE</b><a className="button ghost full" href="mailto:hello@fashionxpress.com?subject=FashionXpress%20concept%20enquiry">Ask about the concept</a></div><div className="side-card resources"><h3>Creator resources</h3><Link to="/get-started">Creator atelier <span>→</span></Link><Link to="/licensing">Licensing concept <span>→</span></Link><Link to="/about#values">Community values <span>→</span></Link></div></aside></section>
  </>
}
