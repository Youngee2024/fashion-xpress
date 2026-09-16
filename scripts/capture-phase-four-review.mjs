import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const output = resolve('review-artifacts', 'phase4-focused-review')
const target = await fetch('http://127.0.0.1:9333/json/new?about:blank', { method: 'PUT' }).then((response) => response.json())
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolveOpen, reject) => { socket.addEventListener('open', resolveOpen, { once: true }); socket.addEventListener('error', reject, { once: true }) })
let sequence = 0
const pending = new Map()
const events = new Map()
const browserErrors = []
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data)
  if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails?.exception?.description ?? message.params.exceptionDetails?.text)
  if (message.id) { const request = pending.get(message.id); pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result); return }
  const listeners = events.get(message.method) ?? []
  events.delete(message.method)
  listeners.forEach((resolveEvent) => resolveEvent(message.params))
})
function send(method, params = {}) { const id = ++sequence; socket.send(JSON.stringify({ id, method, params })); return new Promise((resolveRequest, reject) => pending.set(id, { resolve: resolveRequest, reject })) }
function once(method) { return new Promise((resolveEvent) => events.set(method, [...(events.get(method) ?? []), resolveEvent])) }
async function evaluate(expression) { const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text); return result.result.value }
async function wait(ms = 200) { await new Promise((resolveWait) => setTimeout(resolveWait, ms)) }
async function navigate(path) { const loaded = once('Page.loadEventFired'); await send('Page.navigate', { url: `http://127.0.0.1:5173${path}` }); await loaded; await wait(250) }
async function click(selector) { await evaluate(`document.querySelector(${JSON.stringify(selector)})?.click()`); await wait() }
async function fill(selector, value) { await evaluate(`(() => { const field = document.querySelector(${JSON.stringify(selector)}); if (!field) throw new Error('Missing field: ${selector}'); const prototype = field.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : field.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype, 'value').set.call(field, ${JSON.stringify(value)}); field.dispatchEvent(new Event('input', { bubbles: true })); field.dispatchEvent(new Event('change', { bubbles: true })); })()`) }
async function capture(name, width) {
  await evaluate('document.fonts.ready')
  await wait(100)
  const directory = resolve(output, `${width}x${width === 393 ? 852 : 900}`)
  mkdirSync(directory, { recursive: true })
  const { data } = await send('Page.captureScreenshot', { format: 'png', fromSurface: true })
  writeFileSync(resolve(directory, `${name}.png`), Buffer.from(data, 'base64'))
  const metrics = await evaluate('({ height: document.documentElement.scrollHeight, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, brokenImages: [...document.images].filter((image) => image.complete && !image.naturalWidth).length })')
  return { name, width, ...metrics }
}

// Render real Phase 4 components with a local test context for Live-only and
// asynchronous states. This harness neither creates accounts nor calls Supabase.
async function harness(kind) {
  const expression = `(async () => {
    const dependency = (name) => performance.getEntriesByType('resource').map((entry) => entry.name).find((url) => url.includes('/node_modules/.vite/deps/' + name + '.js?v=')) ?? '/node_modules/.vite/deps/' + name + '.js';
    const React = (await import(dependency('react'))).default;
    const ReactDOM = (await import(dependency('react-dom_client'))).default;
    const Router = await import(dependency('react-router-dom'));
    const { AuthContext } = await import('/src/auth/AuthState.js');
    const { Layout } = await import('/src/components/Layout.jsx');
    const { AuthPage, VerifyOtpPage } = await import('/src/pages/AuthPage.jsx');
    const { ProfileForm } = await import('/src/pages/Profile.jsx');
    const { Community } = await import('/src/pages/Community.jsx');
    const type = ${JSON.stringify(kind)};
    let component, entry;
    const auth = { mode: 'live', configured: true, status: 'ready', profileStatus: 'ready', user: null, profile: null, requestOtp: async () => ({ error: null }), verifyOtp: async () => ({ data: null, error: { message: 'Invalid OTP' } }), checkHandle: async () => true, saveProfile: async () => ({ handle: 'reviewer' }) };
    if (type === 'email') { component = AuthPage; entry = '/auth'; }
    if (type === 'otp') { component = VerifyOtpPage; entry = { pathname: '/auth/verify', state: { email: 'review@example.test' } }; }
    if (type === 'setup') { auth.user = { id: 'review-user' }; component = () => React.createElement(ProfileForm, { setup: true }); entry = '/profile/setup'; }
    if (type === 'loading' || type === 'error') {
      const query = { select() { return this }, eq() { return this }, order() { return this }, range() { return type === 'loading' ? new Promise(() => {}) : Promise.resolve({ data: null, error: new Error('Review-only simulated outage'), count: null }) } };
      auth.client = { from: () => query }; component = Community; entry = '/community';
    }
    document.querySelector('#root').style.display = 'none';
    const previous = document.querySelector('#phase-four-review-root'); if (previous) previous.remove();
    const root = document.createElement('div'); root.id = 'phase-four-review-root'; document.body.prepend(root);
    ReactDOM.createRoot(root).render(React.createElement(AuthContext.Provider, { value: auth }, React.createElement(Router.MemoryRouter, { initialEntries: [entry] }, React.createElement(Layout, { cartCount: 0, onCartOpen: () => {} }, React.createElement(component)))));
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (!root.querySelector('h1')) throw new Error('Review harness did not render: ' + root.innerHTML.slice(0, 200));
  })()`
  try { await evaluate(expression) } catch (error) { throw new Error(`${error.message}\n${browserErrors.join('\n')}`) }
}

await send('Page.enable')
await send('Runtime.enable')
await send('Network.enable')
const results = []
for (const width of [393, 1440]) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: width === 393 ? 852 : 900, deviceScaleFactor: 1, mobile: width === 393 })
  for (const [kind, name] of [['email', 'auth-email-entry'], ['otp', 'otp-verification'], ['setup', 'first-profile-setup'], ['loading', 'community-loading'], ['error', 'community-error']]) {
    await navigate('/auth')
    await harness(kind)
    if (kind === 'loading') await evaluate('document.querySelector(".community-skeleton")?.scrollIntoView({ block: "center", behavior: "instant" })')
    if (kind === 'error') await evaluate('document.querySelector(".community-error")?.scrollIntoView({ block: "center", behavior: "instant" })')
    results.push(await capture(name, width))
  }

  await navigate('/auth')
  await click('.account-card .button')
  results.push(await capture('community-feed', width))
  await click('.account-link')
  results.push(await capture('demo-profile', width))
  await click('.profile-actions a')
  results.push(await capture('profile-editing', width))
  await fill('.profile-form input[name="handle"]', 'fashionreviewguest2026')
  await fill('.profile-form input[name="display_name"]', 'An Editorial Community Member With A Very Long Display Name')
  await click('.profile-form .button')
  results.push(await capture('profile-max-content', width))
  await click('.profile-actions a')
  await click('.account-danger button[aria-expanded]')
  await fill('.account-danger input', 'DELETE MY ACCOUNT')
  await evaluate('document.querySelector(".account-danger")?.scrollIntoView({ block: "center", behavior: "instant" })')
  results.push(await capture('account-deletion-confirmation', width))
  await click('.nav-links a[href="/community"]')
  await click('.community-actions button[aria-controls="discussion-composer"]')
  results.push(await capture('discussion-composer', width))
  await fill('#discussion-composer input', 'A local review discussion about digital garments, collective craft, and creative ownership across connected worlds')
  await fill('#discussion-composer textarea', 'This is a complete local review discussion about digital fashion and creative craft.')
  await click('#discussion-composer .button')
  results.push(await capture('discussion-detail', width))
  await evaluate('document.querySelector(".reply-form")?.scrollIntoView({ block: "center", behavior: "instant" })')
  results.push(await capture('reply-composer', width))
  await evaluate('window.scrollTo({ top: 0, behavior: "instant" })')
  await click('.discussion-actions button:nth-child(3)')
  await evaluate('document.querySelector(".community-editor")?.scrollIntoView({ block: "center", behavior: "instant" })')
  results.push(await capture('discussion-edit', width))
  await click('.community-editor button[type="button"]')
  await click('.discussion-actions button:nth-child(2)')
  results.push(await capture('report-panel', width))
  await click('.discussion-page > .text-link')
  await fill('.community-filter-row input', 'no-results-for-this-review')
  await click('.community-filter-row form button')
  await evaluate('document.querySelector(".thread-list")?.scrollIntoView({ block: "center", behavior: "instant" })')
  results.push(await capture('empty-search', width))
}
socket.close()
mkdirSync(output, { recursive: true })
writeFileSync(resolve(output, 'manifest.json'), JSON.stringify(results, null, 2))
console.log(`Captured ${results.length} Phase 4 review screenshots in ${output}`)
