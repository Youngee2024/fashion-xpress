import { useEffect, useState } from 'react'
import { AuthContext } from './AuthState'
import { APP_MODE } from '../data/appMode'
import { requestEmailOtp, restoreAuthenticatedUser, signOutSession, verifyEmailOtp } from '../data/authWorkflow'
import { DEMO_PROFILE } from '../data/demoIdentity'
import { isHandleAvailable, loadOwnProfile, saveOwnProfile } from '../data/profileWorkflow'
import { supabase } from '../data/supabaseClient'

export function AuthProvider({ children, client = supabase }) {
  const demo = APP_MODE === 'demo'
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileStatus, setProfileStatus] = useState(demo ? 'ready' : 'loading')
  const [status, setStatus] = useState(demo ? 'ready' : client ? 'loading' : 'unavailable')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (demo || !client) return undefined
    let active = true
    restoreAuthenticatedUser(client).then(({ user: restoredUser, error }) => {
      if (!active) return
      if (error && typeof navigator !== 'undefined' && navigator.onLine === false) setNotice('Session check is offline. Reconnect to restore your account.')
      setUser(error ? null : restoredUser)
      setStatus('ready')
    }).catch(() => {
      if (active) { setUser(null); setStatus('ready'); setNotice('Session restoration is unavailable. Please retry when online.') }
    })
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'SIGNED_OUT') { setUser(null); setProfile(null); setProfileStatus('ready'); setStatus('ready') }
      else if (event !== 'INITIAL_SESSION' && session?.user) { setUser(session.user); setStatus('ready') }
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [client, demo])

  useEffect(() => {
    if (demo || !client || !user?.id) return undefined
    let active = true
    setProfile(null)
    setProfileStatus('loading')
    loadOwnProfile(client, user.id).then((data) => {
      if (!active) return
      setProfile(data); setProfileStatus('ready'); setNotice('')
    }).catch(() => { if (active) { setProfileStatus('error'); setNotice('Your profile could not be loaded. Retry after checking your connection.') } })
    return () => { active = false }
  }, [client, demo, user?.id])

  async function refreshProfile() {
    if (demo) return profile
    if (!client || !user) return null
    const data = await loadOwnProfile(client, user.id)
    setProfile(data)
    setProfileStatus('ready')
    return data
  }

  async function saveProfile(value) {
    if (demo) { const next = { ...profile, ...value, id: DEMO_PROFILE.id }; setProfile(next); return next }
    if (!client || !user) throw new Error('Live account service is unavailable.')
    const data = await saveOwnProfile(client, user.id, profile?.id === user.id ? profile : null, value)
    setProfile(data)
    setProfileStatus('ready')
    return data
  }

  async function checkHandle(handle) {
    if (demo) return true
    if (!client) throw new Error('Live profile service is unavailable.')
    return isHandleAvailable(client, handle, user?.id)
  }

  async function requestOtp(email) {
    if (demo || !client) throw new Error('Live sign-in is unavailable.')
    return requestEmailOtp(client, email)
  }

  async function verifyOtp(email, token) {
    if (demo || !client) throw new Error('Live sign-in is unavailable.')
    const response = await verifyEmailOtp(client, email, token)
    if (!response.error && response.data?.user) { setUser(response.data.user); setStatus('ready') }
    return response
  }

  function enterDemo() {
    if (!demo) return
    setUser({ id: DEMO_PROFILE.id })
    setProfile(DEMO_PROFILE)
    setProfileStatus('ready')
    setNotice('Demo identity active. Nothing is published online.')
  }

  function resetDemoProfile() { if (demo) setProfile(DEMO_PROFILE) }

  async function signOut() {
    if (demo) { setUser(null); setProfile(null); setProfileStatus('ready'); setNotice('Demo identity closed. Local discussion previews remain until reset or refresh.'); return }
    if (!client) return
    const { error } = await signOutSession(client)
    if (error) throw error
    setUser(null)
    setProfile(null)
    setProfileStatus('ready')
  }

  async function clearDeletedAccount() {
    if (!client || demo) return
    try { await client.auth.signOut({ scope: 'local' }) } finally {
      setUser(null)
      setProfile(null)
      setProfileStatus('ready')
      setStatus('ready')
    }
  }

  const visibleProfile = profile?.id === user?.id ? profile : null
  const value = { mode: APP_MODE, client, user, profile: visibleProfile, profileStatus: profile && !visibleProfile ? 'loading' : profileStatus, status, notice, configured: demo || Boolean(client), enterDemo, resetDemoProfile, signOut, clearDeletedAccount, requestOtp, verifyOtp, refreshProfile, saveProfile, checkHandle }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
