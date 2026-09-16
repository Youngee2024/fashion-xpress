import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthState'
import { classifyAuthError, safeReturnTo } from '../data/communityRules'

export function RequireAuth({ children, needsProfile = false }) {
  const auth = useAuth()
  const location = useLocation()
  if (auth.status === 'loading') return <section className="page-shell account-page"><h1>Restoring your session…</h1><p role="status">Checking your secure sign-in state.</p></section>
  if (!auth.configured) return <section className="page-shell account-page"><h1>Account service unavailable.</h1><p role="alert">Live Mode is not configured for Supabase Auth on this deployment. No demo sign-in will be substituted.</p></section>
  if (!auth.user) return <Navigate to={`/auth?next=${encodeURIComponent(safeReturnTo(`${location.pathname}${location.search}`))}`} replace />
  if (auth.profileStatus === 'loading') return <section className="page-shell account-page"><h1>Loading your profile…</h1><p role="status">Checking your Community profile.</p></section>
  if (auth.profileStatus === 'error') return <section className="page-shell account-page"><h1>Profile unavailable.</h1><p role="alert">Your profile could not be loaded. Check your connection and retry.</p><button className="button" onClick={() => auth.refreshProfile().catch(() => {})}>Retry profile</button></section>
  if (needsProfile && !auth.profile) return <Navigate to={`/profile/setup?next=${encodeURIComponent(safeReturnTo(`${location.pathname}${location.search}`))}`} replace />
  return children
}

export function AuthPage() {
  const auth = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const next = safeReturnTo(params.get('next'))
  const [email, setEmail] = useState('')
  const [stage, setStage] = useState('idle')
  const [message, setMessage] = useState('')

  if (auth.user) return <Navigate to={auth.profile ? next : `/profile/setup?next=${encodeURIComponent(next)}`} replace />

  async function submit(event) {
    event.preventDefault()
    if (stage === 'sending' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setMessage('Enter a valid email address.'); return }
    setStage('sending')
    setMessage('')
    try {
      const { error } = await auth.requestOtp(email.trim())
      if (error) { setMessage(classifyAuthError(error)); setStage('error'); return }
      navigate(`/auth/verify?next=${encodeURIComponent(next)}`, { state: { email: email.trim() } })
    } catch (error) { setMessage(classifyAuthError(error)); setStage('error') }
  }

  return <section className="page-shell account-page"><span className="eyebrow">Community access</span><h1>{auth.mode === 'demo' ? 'Enter the demo community.' : 'Your place in the conversation.'}</h1>{auth.mode === 'demo' ? <div className="panel account-card"><p>Enter as Runway Guest, a fictional portfolio identity. No real email or account is requested. Your activity stays in this browser tab and is never published online.</p><button className="button" onClick={() => { auth.enterDemo(); navigate(next) }}>Enter Demo Community</button><Link className="text-link" to="/community">Browse first</Link></div> : !auth.configured ? <div className="panel account-card" role="alert"><p>Live account configuration is unavailable. Sign-in is disabled; no demo account will be substituted.</p><Link className="text-link" to="/community">Return to Community</Link></div> : <form className="panel account-card" onSubmit={submit} noValidate aria-busy={stage === 'sending'}><p>Enter an email to receive a six-digit one-time code. The same flow signs in or creates an account without revealing whether an address is registered.</p><label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength="254" required/></label>{message && <p className="form-message error" role="alert">{message}</p>}<button className="button" disabled={stage === 'sending'}>{stage === 'sending' ? 'Sending code…' : 'Send six-digit code'}</button><small>Only Supabase Auth sends a code in Live Mode. No code is sent in Demo Mode.</small></form>}</section>
}

export function VerifyOtpPage() {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeReturnTo(params.get('next'))
  const email = location.state?.email
  const [token, setToken] = useState('')
  const [stage, setStage] = useState('idle')
  const [message, setMessage] = useState('')
  const [cooldownUntil, setCooldownUntil] = useState(() => Date.now() + 60000)
  const [remaining, setRemaining] = useState(60)

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000))), 1000)
    return () => window.clearInterval(timer)
  }, [cooldownUntil])

  if (auth.mode === 'demo') return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />
  if (!auth.configured) return <section className="page-shell account-page"><h1>Verification unavailable.</h1><p role="alert">Live account configuration is missing. No simulated sign-in is available.</p></section>
  if (!email) return <section className="page-shell account-page"><h1>Start with your email.</h1><p>The verification screen was refreshed. For privacy, the pending email was not stored. Request a new code.</p><Link className="button" to={`/auth?next=${encodeURIComponent(next)}`}>Back to sign-in</Link></section>

  async function verify(event) {
    event.preventDefault()
    if (stage === 'verifying' || !/^\d{6}$/.test(token)) { setMessage('Enter all six digits from your email.'); return }
    setStage('verifying'); setMessage('')
    try {
      const { data, error } = await auth.verifyOtp(email, token)
      if (error || !data?.user) { setMessage(classifyAuthError(error ?? { message: 'invalid code' })); setStage('error'); return }
      setStage('complete'); setMessage('Signed in securely. Redirecting…')
      navigate(`/profile/setup?next=${encodeURIComponent(next)}`, { replace: true })
    } catch (error) { setMessage(classifyAuthError(error)); setStage('error') }
  }

  async function resend() {
    if (remaining > 0 || stage === 'sending') return
    setStage('sending'); setMessage('')
    try {
      const { error } = await auth.requestOtp(email)
      if (error) { setMessage(classifyAuthError(error)); setStage('error'); return }
      setCooldownUntil(Date.now() + 60000); setRemaining(60); setStage('idle'); setMessage('If the address can receive mail, a new code is on its way.')
    } catch (error) { setMessage(classifyAuthError(error)); setStage('error') }
  }

  return <section className="page-shell account-page"><span className="eyebrow">Verify email</span><h1>Enter your six-digit code.</h1><form className="panel account-card" onSubmit={verify} noValidate aria-busy={stage === 'verifying'}><p>Check the inbox for {email}. Codes expire according to your Supabase Auth settings.</p><label>One-time code<input value={token} onChange={(event) => setToken(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" aria-describedby="otp-help"/></label><small id="otp-help">Never share this code with anyone.</small>{message && <p className={stage === 'error' ? 'form-message error' : 'form-message success'} role={stage === 'error' ? 'alert' : 'status'}>{message}</p>}<button className="button" disabled={stage === 'verifying' || stage === 'sending'}>{stage === 'verifying' ? 'Verifying…' : 'Verify code'}</button><button className="text-link" type="button" disabled={remaining > 0 || stage === 'sending' || stage === 'verifying'} onClick={resend}>{remaining > 0 ? `Resend in ${remaining}s` : 'Resend code'}</button><Link className="text-link" to={`/auth?next=${encodeURIComponent(next)}`}>Change email</Link></form></section>
}
