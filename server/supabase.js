class DataStoreError extends Error {
  constructor(status) {
    super('Data store request failed.')
    this.name = 'DataStoreError'
    this.status = status
  }
}

export function createDatabase(config, fetchImplementation = fetch) {
  const headers = {
    apikey: config.supabaseKey,
    authorization: `Bearer ${config.supabaseKey}`,
    'content-type': 'application/json',
  }

  async function request(path, options = {}) {
    const response = await fetchImplementation(`${config.supabaseUrl}/rest/v1/${path}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    })
    if (!response.ok) throw new DataStoreError(response.status)
    if (response.status === 204) return null
    const text = await response.text()
    return text ? JSON.parse(text) : null
  }

  async function insert(table, row) {
    const records = await request(table, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) })
    return records[0]
  }

  async function selectOne(table, filters) {
    const query = new URLSearchParams({ select: '*', limit: '1', ...filters })
    const records = await request(`${table}?${query}`)
    return records[0] ?? null
  }

  async function update(table, filters, changes) {
    const query = new URLSearchParams(filters)
    const records = await request(`${table}?${query}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(changes) })
    return records[0] ?? null
  }

  return {
    insertContact: (row) => insert('contact_messages', row),
    findContactByDedupe: (key) => selectOne('contact_messages', { dedupe_key: `eq.${key}` }),
    updateContactNotification: (id, status) => update('contact_messages', { id: `eq.${id}` }, { notification_status: status }),
    insertCreator: (row) => insert('creator_applications', row),
    findCreatorByDedupe: (key) => selectOne('creator_applications', { dedupe_key: `eq.${key}` }),
    updateCreatorNotification: (id, status) => update('creator_applications', { id: `eq.${id}` }, { notification_status: status }),
    findNewsletterByEmail: (email) => selectOne('newsletter_subscriptions', { normalized_email: `eq.${email}` }),
    findNewsletterByConfirmationHash: (hash) => selectOne('newsletter_subscriptions', { confirmation_token_hash: `eq.${hash}` }),
    findNewsletterByUnsubscribeHash: (hash) => selectOne('newsletter_subscriptions', { unsubscribe_token_hash: `eq.${hash}` }),
    insertNewsletter: (row) => insert('newsletter_subscriptions', row),
    updateNewsletter: (id, changes) => update('newsletter_subscriptions', { id: `eq.${id}` }, changes),
    updateNewsletterByConfirmation: (id, hash, changes) => update('newsletter_subscriptions', { id: `eq.${id}`, confirmation_token_hash: `eq.${hash}` }, changes),
    updateNewsletterByUnsubscribe: (id, hash, changes) => update('newsletter_subscriptions', { id: `eq.${id}`, unsubscribe_token_hash: `eq.${hash}` }, changes),
    async consumeRateLimit(key, scope, limit, windowSeconds) {
      const result = await request('rpc/consume_submission_rate_limit', { method: 'POST', body: JSON.stringify({ p_key: key, p_scope: scope, p_limit: limit, p_window_seconds: windowSeconds }) })
      return result === true
    },
  }
}
