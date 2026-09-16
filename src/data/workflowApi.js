import { APP_MODE } from './appMode.js'

export async function workflowAvailability(signal) {
  try {
    const response = await fetch('/api/workflow-status', { signal, headers: { accept: 'application/json' } })
    const data = await response.json()
    return response.ok && data.available === true
  } catch {
    return false
  }
}

export async function submitWorkflow(endpoint, payload, signal) {
  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    return { ok: false, code: 'network_error', message: 'The request could not reach the server. Check your connection and try again.', recoverable: true }
  }

  let data
  try {
    data = await response.json()
  } catch {
    return { ok: false, code: 'server_error', message: 'The server returned an unreadable response. Please try again.', recoverable: true }
  }
  return { ...data, ok: response.ok && data.ok === true, status: response.status, recoverable: response.status >= 429 || response.status >= 500 }
}

export async function runWorkflow({ endpoint, payload, demoMessage, mode = APP_MODE, delayMs = 320, liveSubmit = submitWorkflow }) {
  if (mode !== 'live') {
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs))
    return { ok: true, demo: true, message: demoMessage }
  }
  return liveSubmit(endpoint, payload)
}
