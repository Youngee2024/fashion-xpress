import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthState'
import { FieldError, PrototypeNotice } from '../components/PrototypeUI'
import { COMMUNITY_CATEGORIES, REPORT_REASONS, hasValidationErrors, validateDiscussion, validateReply, validateReport } from '../data/communityRules'
import { useCommunityStore } from '../hooks/useCommunityStore'
import { AuthorLink, CommunityDate } from './Community'

export function Discussion() {
  const { id } = useParams()
  const auth = useAuth()
  const store = useCommunityStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [item, setItem] = useState(null)
  const [stage, setStage] = useState('loading')
  const [message, setMessage] = useState(location.state?.announcement ?? '')
  const [replyText, setReplyText] = useState('')
  const [replyError, setReplyError] = useState('')
  const [editingDiscussion, setEditingDiscussion] = useState(false)
  const [discussionDraft, setDiscussionDraft] = useState(null)
  const [editingReply, setEditingReply] = useState(null)
  const [replyDraft, setReplyDraft] = useState('')
  const [reportTarget, setReportTarget] = useState(null)
  const [report, setReport] = useState({ reason: '', explanation: '' })
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [revision, setRevision] = useState(0)
  const headingRef = useRef(null)
  const replyRef = useRef(null)
  const reportRef = useRef(null)
  const reportReturnRef = useRef(null)

  const focusHeading = useCallback(() => {
    headingRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  useEffect(() => { if (stage === 'ready' && location.state?.announcement) focusHeading() }, [stage, location.state, focusHeading])
  useEffect(() => {
    if (reportTarget) {
      if (!reportReturnRef.current) reportReturnRef.current = document.activeElement
      reportRef.current?.focus({ preventScroll: true })
      document.querySelector('.report-form')?.scrollIntoView({ block: 'start', behavior: 'instant' })
    } else if (reportReturnRef.current?.isConnected) {
      const trigger = reportReturnRef.current
      window.setTimeout(() => trigger.focus(), 0)
      reportReturnRef.current = null
    }
  }, [reportTarget])

  useEffect(() => {
    if (!store) { setStage('unavailable'); return undefined }
    let active = true
    store.get(id).then((result) => { if (active) { setItem(result); setStage(result ? 'ready' : 'missing') } }).catch(() => { if (active) setStage(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error') })
    return () => { active = false }
  }, [store, id, revision])
  const reload = useCallback(() => setRevision((value) => value + 1), [])
  const own = item?.author_id === auth.user?.id
  const canPost = Boolean(auth.user && auth.profile)
  function requireIdentity() {
    if (canPost) return true
    navigate(auth.user ? `/profile/setup?next=${encodeURIComponent(location.pathname)}` : `/auth?next=${encodeURIComponent(location.pathname)}`)
    return false
  }

  async function perform(task, success) {
    if (busyRef.current) return
    busyRef.current = true; setBusy(true); setMessage('')
    try { await task(); setMessage(success); reload(); window.setTimeout(focusHeading, 0) }
    catch { setMessage('The change was not saved. Check your connection and retry; your draft is preserved.') }
    finally { busyRef.current = false; setBusy(false) }
  }

  async function postReply(event) {
    event.preventDefault()
    if (!requireIdentity() || busyRef.current) return
    const error = validateReply(replyText)
    setReplyError(error)
    if (error) { replyRef.current?.focus(); return }
    await perform(async () => { await store.createReply(id, replyText, auth.user.id); setReplyText('') }, auth.mode === 'demo' ? 'Local reply added. It was not published online.' : 'Reply published.')
  }

  async function saveDiscussion(event) {
    event.preventDefault()
    const errors = validateDiscussion(discussionDraft)
    if (hasValidationErrors(errors)) { setMessage(Object.values(errors).find(Boolean)); return }
    await perform(async () => { await store.updateDiscussion(id, discussionDraft, auth.user.id); setEditingDiscussion(false) }, auth.mode === 'demo' ? 'Local discussion updated; nothing was published online.' : 'Discussion updated.')
  }

  async function removeDiscussion() {
    if (!window.confirm('Delete your discussion and all its replies? This cannot be undone.')) return
    if (busyRef.current) return
    busyRef.current = true; setBusy(true)
    try { await store.deleteDiscussion(id, auth.user.id); navigate('/community', { state: { announcement: 'Discussion deleted.' } }) }
    catch { setMessage('The discussion could not be deleted. Nothing changed.'); busyRef.current = false; setBusy(false) }
  }

  async function saveReply(event) {
    event.preventDefault()
    const error = validateReply(replyDraft)
    if (error) { setMessage(error); return }
    await perform(async () => { await store.updateReply(editingReply, replyDraft, auth.user.id); setEditingReply(null) }, auth.mode === 'demo' ? 'Local reply updated; nothing was published online.' : 'Reply updated.')
  }

  async function removeReply(replyId) {
    if (!window.confirm('Delete this reply?')) return
    await perform(() => store.deleteReply(replyId, auth.user.id), 'Reply deleted.')
  }

  async function toggleLike() {
    if (!requireIdentity()) return
    await perform(() => store.toggleLike(id, auth.user.id, item.liked), auth.mode === 'demo' ? 'Local like updated. Nothing was published online.' : 'Like updated.')
  }

  async function submitReport(event) {
    event.preventDefault()
    if (!requireIdentity()) return
    const errors = validateReport(report)
    if (hasValidationErrors(errors)) { setMessage(Object.values(errors).find(Boolean)); return }
    await perform(async () => { await store.report({ ...report, discussion_id: reportTarget?.kind === 'discussion' ? id : null, reply_id: reportTarget?.kind === 'reply' ? reportTarget.id : null }, auth.user.id); setReportTarget(null); setReport({ reason: '', explanation: '' }) }, auth.mode === 'demo' ? 'Local report preview complete. No report was sent online.' : 'Report received for administrative review. No response time is guaranteed.')
  }

  return <section className="page-shell discussion-page"><Link className="text-link" to="/community">← Back to Community</Link>{stage === 'loading' && <div className="community-skeleton" role="status" aria-label="Loading discussion"><span/><span/></div>}{stage === 'unavailable' && <div role="alert"><h1>Community unavailable.</h1><p>Live configuration is missing. No demo discussion was substituted.</p></div>}{stage === 'missing' && <div><h1>Discussion unavailable.</h1><p>It may have been deleted, hidden, or the link may be incorrect.</p></div>}{['offline', 'error'].includes(stage) && <div role="alert"><h1>{stage === 'offline' ? 'You are offline.' : 'Discussion could not load.'}</h1><button className="button ghost" onClick={reload}>Retry</button></div>}{stage === 'ready' && <><div className="discussion-heading"><span className="eyebrow">{item.category} · {auth.mode === 'demo' ? 'Local demo' : 'Published discussion'}</span><h1 ref={headingRef} tabIndex="-1">{item.title}</h1><div className="thread-meta"><AuthorLink author={item.author}/><CommunityDate value={item.created_at}/>{item.edited_at && <span>Edited <CommunityDate value={item.edited_at}/></span>}</div></div>{auth.mode === 'demo' && <PrototypeNotice compact>This is a browser-only discussion preview. Replies, likes, edits, and reports are not published online.</PrototypeNotice>}<p className="discussion-body">{item.body}</p><div className="discussion-actions"><button onClick={toggleLike} aria-pressed={Boolean(item.liked)} disabled={busy}>{item.liked ? 'Unlike' : 'Like'} · {item.like_count}</button><button onClick={() => { if (requireIdentity()) setReportTarget({ kind: 'discussion' }) }}>Report</button>{own && <><button onClick={() => { setDiscussionDraft({ title: item.title, body: item.body, category: item.category }); setEditingDiscussion(true) }}>Edit</button><button onClick={removeDiscussion} disabled={busy}>Delete</button></>}</div>{editingDiscussion && <form className="panel community-editor" onSubmit={saveDiscussion} noValidate><h2>Edit discussion</h2><label>Title<input value={discussionDraft.title} maxLength="120" onChange={(event) => setDiscussionDraft({ ...discussionDraft, title: event.target.value })}/></label><label>Category<select value={discussionDraft.category} onChange={(event) => setDiscussionDraft({ ...discussionDraft, category: event.target.value })}>{COMMUNITY_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label><label>Body<textarea value={discussionDraft.body} maxLength="5000" rows="5" onChange={(event) => setDiscussionDraft({ ...discussionDraft, body: event.target.value })}/></label><button className="button" disabled={busy}>Save changes</button><button className="text-link" type="button" onClick={() => setEditingDiscussion(false)}>Cancel</button></form>}{message && <p className={message.includes('could not') || message.includes('not saved') ? 'form-message error' : 'form-message success'} role={message.includes('could not') || message.includes('not saved') ? 'alert' : 'status'}>{message}</p>}<section className="replies"><h2>{item.reply_count} {item.reply_count === 1 ? 'reply' : 'replies'}</h2>{item.replies.length ? item.replies.map((reply) => <article className="reply" key={reply.id}><div className="thread-meta"><AuthorLink author={reply.author}/><CommunityDate value={reply.created_at}/>{reply.edited_at && <span>Edited</span>}</div>{editingReply === reply.id ? <form onSubmit={saveReply}><label>Edit reply<textarea value={replyDraft} maxLength="2000" onChange={(event) => setReplyDraft(event.target.value)} rows="3"/></label><button className="button" disabled={busy}>Save reply</button><button className="text-link" type="button" onClick={() => setEditingReply(null)}>Cancel</button></form> : <p>{reply.body}</p>}<div className="reply-actions"><button onClick={() => { if (requireIdentity()) setReportTarget({ kind: 'reply', id: reply.id }) }}>Report</button>{reply.author_id === auth.user?.id && <><button onClick={() => { setEditingReply(reply.id); setReplyDraft(reply.body) }}>Edit</button><button onClick={() => removeReply(reply.id)} disabled={busy}>Delete</button></>}</div></article>) : <p>No replies yet. Start the conversation.</p>}{canPost ? <form className="panel reply-form" onSubmit={postReply} noValidate aria-busy={busy}><label>Your reply<textarea ref={replyRef} value={replyText} onChange={(event) => { setReplyText(event.target.value); setReplyError('') }} maxLength="2000" rows="4" aria-invalid={Boolean(replyError)}/></label><FieldError>{replyError}</FieldError><small>Plain text only. Be respectful and do not share private information.</small><button className="button" disabled={busy}>{busy ? 'Posting…' : auth.mode === 'demo' ? 'Add local reply' : 'Publish reply'}</button></form> : <div className="panel reply-form"><p>Sign in to reply or react.</p><Link className="button" to={`/auth?next=${encodeURIComponent(location.pathname)}`}>{auth.mode === 'demo' ? 'Enter Demo Community' : 'Sign in'}</Link></div>}</section>{reportTarget && <form className="panel report-form" onSubmit={submitReport} noValidate><h2>Report {reportTarget.kind}</h2><p>{auth.mode === 'demo' ? 'This creates a local preview only. No report is sent.' : 'Reports are private and reviewed manually through Supabase. A response is not guaranteed.'}</p><label>Reason<select ref={reportRef} value={report.reason} onChange={(event) => setReport({ ...report, reason: event.target.value })}><option value="">Choose a reason</option>{REPORT_REASONS.map((reason) => <option key={reason}>{reason}</option>)}</select></label><label>Optional explanation<textarea value={report.explanation} onChange={(event) => setReport({ ...report, explanation: event.target.value })} maxLength="500" rows="3"/></label><button className="button" disabled={busy}>Send report</button><button className="text-link" type="button" onClick={() => setReportTarget(null)}>Cancel</button></form>}</>}</section>
}
