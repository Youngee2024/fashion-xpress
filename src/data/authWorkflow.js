export async function restoreAuthenticatedUser(client) {
  const { data, error } = await client.auth.getUser()
  return { user: data?.user ?? null, error: error ?? null }
}

export function requestEmailOtp(client, email) {
  return client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
}

export function verifyEmailOtp(client, email, token) {
  return client.auth.verifyOtp({ email, token, type: 'email' })
}

export function signOutSession(client) {
  return client.auth.signOut()
}
