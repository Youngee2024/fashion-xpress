export function isPublicSupabaseKey(value) {
  const key = typeof value === 'string' ? value.trim() : ''
  if (/^sb_publishable_[A-Za-z0-9_-]{8,}$/.test(key)) return true
  if (!/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) return false
  try {
    const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.role === 'anon'
  } catch { return false }
}
