import { hasServerConfiguration } from '../server/config.js'

export function GET() {
  return Response.json({ available: hasServerConfiguration() }, { headers: { 'cache-control': 'no-store' } })
}

export default {
  fetch(request) {
    if (request.method !== 'GET') return Response.json({ ok: false, code: 'method_not_allowed', message: 'This endpoint only accepts GET requests.' }, { status: 405, headers: { allow: 'GET' } })
    return GET()
  },
}
