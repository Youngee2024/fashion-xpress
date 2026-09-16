class DeliveryError extends Error {
  constructor(status) {
    super('Delivery provider request failed.')
    this.name = 'DeliveryError'
    this.status = status
  }
}

export function createMailer(config, fetchImplementation = fetch) {
  async function request(path, options) {
    const response = await fetchImplementation(`https://api.resend.com${path}`, {
      ...options,
      headers: { authorization: `Bearer ${config.resendKey}`, 'content-type': 'application/json', ...options.headers },
    })
    if (!response.ok) throw new DeliveryError(response.status)
    const text = await response.text()
    return text ? JSON.parse(text) : null
  }

  return {
    send(template, idempotencyKey) {
      return request('/emails', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({ from: config.emailFrom, ...template }),
      })
    },
    async setContact(email, unsubscribed) {
      try {
        return await request(`/contacts/${encodeURIComponent(email)}`, { method: 'PATCH', body: JSON.stringify({ unsubscribed }) })
      } catch (error) {
        if (error.status !== 404) throw error
        return request('/contacts', { method: 'POST', body: JSON.stringify({ email, unsubscribed }) })
      }
    },
  }
}
