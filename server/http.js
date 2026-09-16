export const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
}

export function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } })
}

export function publicError(status, code, message, fields) {
  return json(status, { ok: false, code, message, ...(fields ? { fields } : {}) })
}

export async function readJson(request, maximumBytes) {
  if (request.method !== 'POST') return { response: publicError(405, 'method_not_allowed', 'This endpoint only accepts POST requests.'), allow: 'POST' }
  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase()
  if (contentType !== 'application/json') return { response: publicError(415, 'unsupported_media_type', 'Send this request as JSON.') }
  const declaredSize = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(declaredSize) && declaredSize > maximumBytes) return { response: publicError(413, 'payload_too_large', 'The submission is too large.') }

  try {
    const reader = request.body?.getReader()
    if (!reader) return { response: publicError(400, 'invalid_json', 'The request could not be read.') }
    const chunks = []
    let bytes = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > maximumBytes) {
        await reader.cancel()
        return { response: publicError(413, 'payload_too_large', 'The submission is too large.') }
      }
      chunks.push(value)
    }
    const payload = new Uint8Array(bytes)
    let offset = 0
    for (const chunk of chunks) { payload.set(chunk, offset); offset += chunk.byteLength }
    const text = new TextDecoder('utf-8', { fatal: true }).decode(payload)
    const body = JSON.parse(text)
    if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error('Invalid body')
    return { body }
  } catch {
    return { response: publicError(400, 'invalid_json', 'The request could not be read.') }
  }
}

export function withAllow(response, allow) {
  const headers = new Headers(response.headers)
  headers.set('allow', allow)
  return new Response(response.body, { status: response.status, headers })
}
