import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icons'

const seed = [
  { id: 1, title: 'How do I price my first digital collection?', author: 'DigitalDesigner', category: 'Marketplace', replies: 24, likes: 42, time: '2h', text: 'I’m launching ten pieces and weighing rarity, craft, and market comparison. What has worked for other creators?' },
  { id: 2, title: 'Blender vs Maya for fashion design', author: '3DArtist', category: 'Tools', replies: 18, likes: 37, time: '5h', text: 'Making the shift from physical to digital fashion. I’d love perspectives from artists with garment workflows in both.' },
  { id: 3, title: 'My “Neon Dreams” collection is live', author: 'LunaCouture', category: 'Showcase', replies: 56, likes: 89, time: '1d', text: 'Six months of work, reactive materials, and a lot of iteration. Sharing the complete AR-ready collection for feedback.' },
  { id: 4, title: 'Making L2 minting work for small creators', author: 'CryptoCreator', category: 'Technology', replies: 42, likes: 67, time: '2d', text: 'A practical breakdown of the lower-impact network choices and fee patterns I tracked over the last month.' },
]

export function Community() {
  const [threads, setThreads] = useState(seed)
  const [query, setQuery] = useState('')
  const [liked, setLiked] = useState([])
  const [composer, setComposer] = useState(false)
  const [draft, setDraft] = useState({ title: '', text: '' })
  const [status, setStatus] = useState('')
  const shown = useMemo(() => threads.filter((thread) => `${thread.title} ${thread.author} ${thread.category}`.toLowerCase().includes(query.trim().toLowerCase())), [threads, query])

  function toggleLike(id) {
    const isLiked = liked.includes(id)
    setLiked((current) => isLiked ? current.filter((likedId) => likedId !== id) : [...current, id])
    setThreads((current) => current.map((thread) => thread.id === id ? { ...thread, likes: thread.likes + (isLiked ? -1 : 1) } : thread))
  }

  function previewDiscussion(event) {
    event.preventDefault()
    setThreads((current) => [{ id: Date.now(), title: draft.title, text: draft.text, author: 'You', category: 'Local preview', replies: 0, likes: 0, time: 'now' }, ...current])
    setDraft({ title: '', text: '' })
    setComposer(false)
    setStatus('Discussion added to this local preview. It has not been published online.')
  }

  return <>
    <section className="community-hero page-shell"><span className="eyebrow">The FashionXpress circle</span><h1>Ideas look better<br/><em>in company.</em></h1><p>Ask, share, critique, and build alongside the people shaping digital fashion.</p><div className="community-actions"><label className="search"><span className="sr-only">Search conversations</span><Icon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations"/></label><button className="button" onClick={() => setComposer((current) => !current)} aria-expanded={composer} aria-controls="discussion-composer"><Icon name="plus" size={17}/> {composer ? 'Close composer' : 'Start a discussion'}</button></div></section>
    {composer && <section className="page-shell"><form id="discussion-composer" className="composer panel" onSubmit={previewDiscussion}><div><span className="eyebrow">Local discussion preview</span><button type="button" className="icon-button" onClick={() => setComposer(false)} aria-label="Close discussion composer"><Icon name="close"/></button></div><p className="prototype-note">This preview stays in your browser session and is not published online.</p><label>Discussion title<input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })}/></label><label>Discussion body<textarea required rows="4" value={draft.text} onChange={(event) => setDraft({ ...draft, text: event.target.value })}/></label><button className="button" type="submit">Add local preview</button></form></section>}
    <p className="sr-status" role="status" aria-live="polite">{status}</p>
    <section id="community-feed" className="page-shell community-layout"><div><div className="feed-title"><h2>Latest discussions</h2><span>{shown.length} conversations</span></div><div className="thread-list">{shown.length ? shown.map((thread) => <article className="thread" key={thread.id}><div className="avatar" aria-hidden="true">{thread.author[0]}</div><div><div className="thread-meta"><strong>@{thread.author}</strong><span>{thread.time}</span><i>{thread.category}</i></div><h3>{thread.title}</h3><p>{thread.text}</p><div className="thread-actions"><span>◯ {thread.replies} replies</span><button className={liked.includes(thread.id) ? 'liked' : ''} onClick={() => toggleLike(thread.id)} aria-pressed={liked.includes(thread.id)} aria-label={`${liked.includes(thread.id) ? 'Unlike' : 'Like'} ${thread.title}`}><Icon name="heart" size={16}/> {thread.likes}</button></div></div></article>) : <div className="empty-state" role="status"><h3>No conversations found.</h3><p>Try another phrase or clear your search.</p><button className="button ghost" onClick={() => setQuery('')}>Clear search</button></div>}</div></div><aside className="community-side"><div className="side-card"><span className="eyebrow">Coming up</span><h3>Virtual Fashion Week</h3><p>Live showcases from designers across the continent.</p><b>15 · OCT · 2026</b><a className="button ghost full" href="mailto:hello@fashionxpress.com?subject=Virtual%20Fashion%20Week%20invite">Request an invite</a></div><div className="side-card resources"><h3>Creator resources</h3><Link to="/get-started">Creator atelier <span>→</span></Link><a href="mailto:creators@fashionxpress.com?subject=FashionXpress%20API%20access">Request API access <span>→</span></a><Link to="/about#values">Community values <span>→</span></Link></div></aside></section>
  </>
}
