import { useEffect, useMemo } from 'react'
import { useAuth } from '../auth/AuthState'
import { DEMO_PROFILE } from '../data/demoIdentity'
import { createDemoCommunityStore, createLiveCommunityStore } from '../data/communityStore'

const demoStore = createDemoCommunityStore(DEMO_PROFILE)

export function useCommunityStore() {
  const { mode, client, user, profile } = useAuth()
  useEffect(() => { if (mode === 'demo' && profile) demoStore.setProfile(profile) }, [mode, profile])
  return useMemo(() => mode === 'demo' ? demoStore : client ? createLiveCommunityStore(client, () => user) : null, [mode, client, user])
}

export function resetDemoCommunity() { demoStore.reset() }
