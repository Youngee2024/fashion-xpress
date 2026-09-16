import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthState'
import { useCommunityStore, resetDemoCommunity } from '../hooks/useCommunityStore'
import { PRESET_AVATARS, PROFILE_IDENTITIES, hasValidationErrors, safeReturnTo, validateProfile } from '../data/communityRules'

export function ProfilePage() {
  const { handle } = useParams()
  const auth = useAuth()
  const store = useCommunityStore()
  const [data, setData] = useState(null)
  const [activity, setActivity] = useState(null)
  const [stage, setStage] = useState('loading')
  useEffect(() => {
    if (!store) { setStage('unavailable'); return undefined }
    let active = true
    store.profileByHandle(handle).then(async (profile) => [profile, profile ? await store.activity(profile.id) : null]).then(([profile, result]) => {
      if (active) { setData(profile); setActivity(result); setStage(profile ? 'ready' : 'missing') }
    }).catch(() => { if (active) setStage('error') })
    return () => { active = false }
  }, [store, handle, auth.profile])
  const own = data?.id === auth.user?.id
  return <section className="page-shell account-page"><span className="eyebrow">Community profile</span>{stage === 'loading' ? <p role="status">Loading profile…</p> : stage === 'unavailable' ? <div role="alert"><h1>Profile service unavailable.</h1><p>Live Supabase configuration is missing. No demo profile was substituted.</p></div> : stage === 'error' ? <div role="alert"><h1>Profile unavailable.</h1><p>Check your connection and retry.</p><button className="button" onClick={() => window.location.reload()}>Retry</button></div> : stage === 'missing' ? <div><h1>Profile not found.</h1><Link className="button" to="/community">Back to Community</Link></div> : <><div className="profile-hero panel"><span className={`profile-avatar avatar-${data.avatar_id}`} aria-hidden="true">{data.display_name?.[0] ?? 'F'}</span><div><h1>{data.display_name}</h1><p>@{data.handle} · {data.identity}</p><p>{data.bio || 'No bio yet.'}</p>{data.location && <small>{data.location}</small>}</div>{own && <div className="profile-actions"><Link className="button ghost" to="/profile/edit">Edit profile</Link><SignOutButton/></div>}</div><div className="profile-activity"><article><h2>Discussions</h2>{activity?.discussions?.length ? activity.discussions.map((item) => <Link className="activity-link" to={`/community/${item.id}`} key={item.id}>{item.title}<span>{new Date(item.created_at).toLocaleDateString()}</span></Link>) : <p>No published discussions yet.</p>}</article><article><h2>Replies</h2>{activity?.replies?.length ? activity.replies.map((item) => <Link className="activity-link" to={`/community/${item.discussion_id}`} key={item.id}>{item.body}<span>{new Date(item.created_at).toLocaleDateString()}</span></Link>) : <p>No published replies yet.</p>}</article></div></>}</section>
}

export function SignOutButton() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  async function signOut() {
    try { await auth.signOut(); navigate('/community', { state: { announcement: 'You have signed out of Community.' } }) } catch { setError('Sign-out did not complete. Please retry.') }
  }
  return <><button className="text-link" onClick={signOut}>Sign out</button>{error && <span role="alert">{error}</span>}</>
}

export function ProfileForm({ setup = false }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeReturnTo(params.get('next'))
  const [form, setForm] = useState(() => ({ handle: auth.profile?.handle ?? '', display_name: auth.profile?.display_name ?? '', bio: auth.profile?.bio ?? '', location: auth.profile?.location ?? '', identity: auth.profile?.identity ?? 'Community Member', avatar_id: auth.profile?.avatar_id ?? 'acid' }))
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const busy = useRef(false)

  if (setup && auth.profile) return <Navigate to={next} replace />

  async function submit(event) {
    event.preventDefault()
    if (busy.current) return
    const nextErrors = validateProfile(form)
    setErrors(nextErrors)
    if (hasValidationErrors(nextErrors)) { setMessage('Review the highlighted profile fields.'); return }
    busy.current = true; setStatus('saving'); setMessage('')
    try {
      if (!(await auth.checkHandle(form.handle.trim().toLowerCase()))) { setErrors((current) => ({ ...current, handle: 'This handle is already taken.' })); setStatus('error'); setMessage('Choose another handle.'); return }
      const saved = await auth.saveProfile({ handle: form.handle.trim().toLowerCase(), display_name: form.display_name.trim(), bio: form.bio.trim(), location: form.location.trim(), identity: form.identity, avatar_id: form.avatar_id })
      setStatus('complete'); setMessage('Profile saved.')
      navigate(setup ? next : `/profile/${saved.handle}`, { replace: true })
    } catch (error) {
      setStatus('error')
      setMessage(error?.code === '23505' ? 'This handle is already taken. Choose another.' : 'Profile could not be saved. Check your connection and retry.')
    } finally { busy.current = false }
  }

  return <section className="page-shell account-page"><span className="eyebrow">{setup ? 'First visit' : 'Profile settings'}</span><h1>{setup ? 'Make the space yours.' : 'Edit your profile.'}</h1><p>Only the fields below are public. Your email stays in Supabase Auth and is not shown on your profile. Identity labels do not grant permissions.</p><form className="panel account-card profile-form" onSubmit={submit} noValidate aria-busy={status === 'saving'}><label>Handle<input name="handle" value={form.handle} onChange={(event) => setForm({ ...form, handle: event.target.value.toLowerCase() })} maxLength="24" aria-invalid={Boolean(errors.handle)}/>{errors.handle && <small className="field-error">{errors.handle}</small>}</label><label>Display name<input name="display_name" value={form.display_name} onChange={(event) => setForm({ ...form, display_name: event.target.value })} maxLength="60" aria-invalid={Boolean(errors.display_name)}/>{errors.display_name && <small className="field-error">{errors.display_name}</small>}</label><label>Short bio<textarea name="bio" value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} maxLength="280" rows="3" aria-invalid={Boolean(errors.bio)}/>{errors.bio && <small className="field-error">{errors.bio}</small>}</label><label>Location (optional)<input name="location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} maxLength="80" aria-invalid={Boolean(errors.location)}/>{errors.location && <small className="field-error">{errors.location}</small>}</label><label>Identity<select name="identity" value={form.identity} onChange={(event) => setForm({ ...form, identity: event.target.value })}>{PROFILE_IDENTITIES.map((identity) => <option key={identity}>{identity}</option>)}</select></label><fieldset className="avatar-options"><legend>Preset avatar</legend>{PRESET_AVATARS.map((avatar) => <label key={avatar}><input type="radio" name="avatar_id" checked={form.avatar_id === avatar} onChange={() => setForm({ ...form, avatar_id: avatar })}/><span className={`profile-avatar avatar-${avatar}`} aria-hidden="true">{form.display_name?.[0] ?? 'F'}</span><span>{avatar}</span></label>)}</fieldset>{message && <p className={status === 'error' ? 'form-message error' : 'form-message success'} role={status === 'error' ? 'alert' : 'status'}>{message}</p>}<button className="button" disabled={status === 'saving'}>{status === 'saving' ? 'Saving…' : 'Save profile'}</button>{!setup && <Link className="text-link" to={`/profile/${auth.profile?.handle}`}>Cancel</Link>}</form>{!setup && <AccountDeletion/>}</section>
}

function AccountDeletion() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const deletingRef = useRef(false)

  async function remove() {
    if (confirmation !== 'DELETE MY ACCOUNT' || deletingRef.current) return
    deletingRef.current = true
    setStatus('deleting'); setError('')
    if (auth.mode === 'demo') {
      resetDemoCommunity()
      await auth.signOut()
      navigate('/community', { replace: true })
      return
    }
    try {
      const { data } = await auth.client.auth.getSession()
      if (!data?.session?.access_token) throw new Error('Session expired')
      const response = await fetch('/api/account/delete', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ confirmation }) })
      if (!response.ok) throw new Error('Deletion failed')
    } catch { setError('Account deletion could not be confirmed. Check your account status before retrying, or contact support.'); setStatus('error'); deletingRef.current = false; return }
    try { await auth.clearDeletedAccount() } catch { /* Account deletion was confirmed; the in-memory session is cleared even if SDK sign-out fails. */ }
    navigate('/community', { replace: true, state: { announcement: 'Your account was deleted. Community content tied to it was removed.' } })
  }

  return <div className="account-danger panel"><h2>Delete account</h2><p>In Live Mode this permanently deletes your profile, discussions, replies, likes, and reports. This cannot be undone. In Demo Mode it resets local activity only.</p><button className="text-link" aria-expanded={open} onClick={() => setOpen(!open)}>Review deletion</button>{open && <div><label>Type DELETE MY ACCOUNT to confirm<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off"/></label><button className="button ghost" disabled={confirmation !== 'DELETE MY ACCOUNT' || status === 'deleting'} onClick={remove}>{status === 'deleting' ? 'Deleting…' : auth.mode === 'demo' ? 'Reset demo identity' : 'Permanently delete account'}</button>{error && <p role="alert" className="form-message error">{error}</p>}</div>}</div>
}
