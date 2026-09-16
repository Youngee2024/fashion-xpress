const PUBLIC_PROFILE_FIELDS = 'id,handle,display_name,bio,location,identity,avatar_id,created_at,updated_at'

export async function loadOwnProfile(client, userId) {
  const { data, error } = await client.from('community_profiles').select(PUBLIC_PROFILE_FIELDS).eq('id', userId).maybeSingle()
  if (error) throw error
  return data ?? null
}

export async function saveOwnProfile(client, userId, existingProfile, value) {
  if (!userId) throw new Error('Sign in before editing a profile.')
  const query = existingProfile
    ? client.from('community_profiles').update(value).eq('id', userId)
    : client.from('community_profiles').insert({ ...value, id: userId })
  const { data, error } = await query.select(PUBLIC_PROFILE_FIELDS).single()
  if (error) throw error
  return data
}

export async function isHandleAvailable(client, handle, userId) {
  const { data, error } = await client.from('community_profiles').select('id').eq('handle', handle).maybeSingle()
  if (error) throw error
  return !data || data.id === userId
}
