import assert from 'node:assert/strict'

const routes = ['/', '/collections', '/collections/neo-safari', '/ar-tryon', '/community', '/about', '/contact', '/get-started', '/mint/neo-safari', '/definitely-missing']
const widths = [320, 375, 393, 768, 1024, 1440]
const expectedHeadings = ['Wear the', 'Digital pieces.', 'Neo-Safari 2026', 'Your room.', 'Ideas look better', 'African creativity,', 'Message', 'Bring us what', 'Neo-Safari 2026', 'Off the runway.']

const target = await fetch('http://127.0.0.1:9333/json/new?about:blank', { method: 'PUT' }).then((response) => response.json())
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

let requestId = 0
const pending = new Map()
const events = new Map()
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data)
  if (message.id) {
    const request = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) request.reject(new Error(message.error.message))
    else request.resolve(message.result)
    return
  }
  const listeners = events.get(message.method) ?? []
  events.delete(message.method)
  listeners.forEach((resolve) => resolve(message.params))
})

function send(method, params = {}) {
  const id = ++requestId
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
}

function once(method) {
  return new Promise((resolve) => events.set(method, [...(events.get(method) ?? []), resolve]))
}

async function navigate(url, reload = false) {
  const loaded = once('Page.loadEventFired')
  if (reload) await send('Page.reload', { ignoreCache: true })
  else await send('Page.navigate', { url })
  await loaded
  await new Promise((resolve) => setTimeout(resolve, 80))
}

async function inspect() {
  const { result } = await send('Runtime.evaluate', {
    expression: `({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content,
      heading: document.querySelector('h1')?.innerText,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      viewportWidth: document.documentElement.clientWidth,
      contentWidth: document.documentElement.scrollWidth,
      overflowElements: [...document.querySelectorAll('body *')].filter((element) => { const rect = element.getBoundingClientRect(); return rect.right > document.documentElement.clientWidth + .01 || rect.left < -.01 }).slice(0, 8).map((element) => ({ tag: element.tagName, className: element.className, left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right })),
      brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length,
      unnamedButtons: [...document.querySelectorAll('button')].filter((button) => !button.disabled && !button.innerText.trim() && !button.getAttribute('aria-label')).length
    })`,
    returnByValue: true,
  })
  return result.value
}

await send('Page.enable')
await send('Runtime.enable')

for (const port of [5173, 4173]) {
  const testedWidths = port === 5173 ? [393, 1440] : widths
  for (const width of testedWidths) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: width < 600 ? 852 : 900, deviceScaleFactor: 1, mobile: width < 600 })
    for (let index = 0; index < routes.length; index += 1) {
      await navigate(`http://127.0.0.1:${port}${routes[index]}`)
      let initial = await inspect()
      if (initial.heading?.includes('connection was interrupted')) {
        await navigate(`http://127.0.0.1:${port}${routes[index]}`)
        initial = await inspect()
      }
      assert.match(initial.heading, new RegExp(expectedHeadings[index].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${routes[index]} did not render the React page at ${width}px on port ${port}`)
      assert.match(initial.title, /FashionXpress/)
      assert.ok(initial.description.length > 40)
      assert.equal(initial.overflow, false, `${routes[index]} overflowed at ${width}px on port ${port} (${initial.contentWidth}/${initial.viewportWidth}): ${JSON.stringify(initial.overflowElements)}`)
      assert.equal(initial.brokenImages, 0)
      assert.equal(initial.unnamedButtons, 0)
      if (width === 393) {
        await navigate(null, true)
        const reloaded = await inspect()
        assert.equal(reloaded.heading, initial.heading, `${routes[index]} changed after refresh`)
      }
    }
  }
}

await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 1, mobile: true })
await navigate('http://127.0.0.1:4173/collections/neo-safari')
await send('Runtime.evaluate', { expression: `document.querySelector('.detail-actions button').focus(); document.querySelector('.detail-actions button').click()` })
await new Promise((resolve) => setTimeout(resolve, 250))
let { result: { value: cartState } } = await send('Runtime.evaluate', { expression: `({ role: document.querySelector('.drawer')?.getAttribute('role'), modal: document.querySelector('.drawer')?.getAttribute('aria-modal'), label: document.querySelector('.drawer')?.getAttribute('aria-labelledby'), closeName: document.querySelector('.drawer .icon-button')?.getAttribute('aria-label'), overflow: document.body.style.overflow, activeName: document.activeElement?.getAttribute('aria-label') })`, returnByValue: true })
assert.deepEqual(cartState, { role: 'dialog', modal: 'true', label: 'cart-title', closeName: 'Close shopping bag', overflow: 'hidden', activeName: 'Close shopping bag' })
await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', modifiers: 8 })
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', modifiers: 8 })
let { result: { value: trappedAtEnd } } = await send('Runtime.evaluate', { expression: `document.activeElement?.getAttribute('aria-label')`, returnByValue: true })
assert.match(trappedAtEnd, /^Remove /)
await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab' })
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab' })
let { result: { value: trappedAtStart } } = await send('Runtime.evaluate', { expression: `document.activeElement?.getAttribute('aria-label')`, returnByValue: true })
assert.equal(trappedAtStart, 'Close shopping bag')
await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape' })
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' })
await new Promise((resolve) => setTimeout(resolve, 80))
let { result: { value: closedState } } = await send('Runtime.evaluate', { expression: `({ dialog: Boolean(document.querySelector('.drawer')), overflow: document.body.style.overflow, focusRestored: document.activeElement?.innerText.toLowerCase().includes('add to bag'), activeTag: document.activeElement?.tagName })`, returnByValue: true })
assert.deepEqual(closedState, { dialog: false, overflow: '', focusRestored: true, activeTag: 'BUTTON' })

await navigate('http://127.0.0.1:4173/collections')
let { result: { value: filterState } } = await send('Runtime.evaluate', { expression: `({ total: document.querySelectorAll('.filter-bar button[aria-pressed]').length, selected: document.querySelectorAll('.filter-bar button[aria-pressed="true"]').length })`, returnByValue: true })
assert.deepEqual(filterState, { total: 4, selected: 1 })
await navigate('http://127.0.0.1:4173/ar-tryon')
let { result: { value: outfitState } } = await send('Runtime.evaluate', { expression: `({ total: document.querySelectorAll('.outfit-list button[aria-pressed]').length, selected: document.querySelectorAll('.outfit-list button[aria-pressed="true"]').length, captureDisabled: document.querySelector('.capture') === null || document.querySelector('.capture').disabled })`, returnByValue: true })
assert.deepEqual(outfitState, { total: 4, selected: 1, captureDisabled: true })

await navigate('http://127.0.0.1:4173/community')
let { result: { value: communityLinks } } = await send('Runtime.evaluate', { expression: `[...document.querySelectorAll('.resources a')].map((link) => link.getAttribute('href'))`, returnByValue: true })
assert.deepEqual(communityLinks, ['/get-started', 'mailto:creators@fashionxpress.com?subject=FashionXpress%20API%20access', '/about#values'])
await send('Runtime.evaluate', { expression: `document.querySelector('.resources a:last-child').click()` })
await new Promise((resolve) => setTimeout(resolve, 150))
let { result: { value: hashState } } = await send('Runtime.evaluate', { expression: `({ path: location.pathname, hash: location.hash, targetExists: Boolean(document.querySelector('#values')), scrolled: scrollY > 0 })`, returnByValue: true })
assert.deepEqual(hashState, { path: '/about', hash: '#values', targetExists: true, scrolled: true })

await navigate('http://127.0.0.1:4173/')
await send('Runtime.evaluate', { expression: `document.querySelector('.mobile-menu').click()` })
await new Promise((resolve) => setTimeout(resolve, 80))
let { result: { value: navigationState } } = await send('Runtime.evaluate', { expression: `({ expanded: document.querySelector('.mobile-menu').getAttribute('aria-expanded'), hasSkipLink: Boolean(document.querySelector('a.skip-link[href="#main-content"]')) })`, returnByValue: true })
assert.deepEqual(navigationState, { expanded: 'true', hasSkipLink: true })
await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape' })
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' })
await new Promise((resolve) => setTimeout(resolve, 80))
let { result: { value: navigationClosed } } = await send('Runtime.evaluate', { expression: `document.querySelector('.mobile-menu').getAttribute('aria-expanded')`, returnByValue: true })
assert.equal(navigationClosed, 'false')

socket.close()
console.log(`Browser smoke checks passed for ${routes.length} routes in development and production preview at 320–1440px, including refresh, dialog, and toggle-state checks.`)
