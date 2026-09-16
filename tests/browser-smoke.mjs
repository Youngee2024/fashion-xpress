import assert from 'node:assert/strict'

const routes = ['/', '/collections', '/collections/neo-safari', '/ar-tryon', '/community', '/about', '/contact', '/get-started', '/mint/neo-safari', '/privacy', '/terms', '/licensing', '/refund-policy', '/accessibility', '/newsletter/confirm', '/newsletter/unsubscribe', '/definitely-missing']
const widths = [320, 375, 393, 768, 1024, 1440, 1920]
const expectedHeadings = ['Wear the', 'Digital pieces.', 'Neo-Safari 2026', 'AR Try-on', 'Ideas look better', 'African creativity,', 'Message', 'Bring what', 'Neo-Safari 2026', 'Privacy, in plain language.', 'Terms for exploring', 'Digital fashion licensing.', 'Purchases are unavailable.', 'Designed for more ways', 'Confirm your place.', 'Leave the list.', 'Off the runway.']

const target = await fetch('http://127.0.0.1:9333/json/new?about:blank', { method: 'PUT' }).then((response) => response.json())
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

let requestId = 0
const pending = new Map()
const events = new Map()
const pageHeights = {}
const browserErrors = []
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data)
  if (message.id) {
    const request = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) request.reject(new Error(message.error.message))
    else request.resolve(message.result)
    return
  }
  if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails?.text ?? 'Unhandled browser exception')
  if (message.method === 'Log.entryAdded' && ['error', 'warning'].includes(message.params.entry?.level)) browserErrors.push(`${message.params.entry.text} ${message.params.entry.url ?? ''}`.trim())
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
      contentHeight: document.documentElement.scrollHeight,
      overflowElements: [...document.querySelectorAll('body *')].filter((element) => { const rect = element.getBoundingClientRect(); return rect.right > document.documentElement.clientWidth + .01 || rect.left < -.01 }).slice(0, 8).map((element) => ({ tag: element.tagName, className: element.className, left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right })),
      brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length,
      unsizedImages: [...document.images].filter((image) => !image.hasAttribute('width') || !image.hasAttribute('height')).length,
      unlabelledFields: [...document.querySelectorAll('input,select,textarea')].filter((field) => !field.labels?.length && !field.getAttribute('aria-label') && !field.getAttribute('aria-labelledby')).length,
      smallTargets: [...document.querySelectorAll('a[href],button,input,select,textarea')].filter((target) => { const rect = target.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44) }).slice(0, 8).map((target) => ({ tag:target.tagName, className:target.className, text:target.innerText?.trim().slice(0,30), width:target.getBoundingClientRect().width, height:target.getBoundingClientRect().height })),
      unnamedButtons: [...document.querySelectorAll('button')].filter((button) => !button.disabled && !button.innerText.trim() && !button.getAttribute('aria-label')).length
    })`,
    returnByValue: true,
  })
  return result.value
}

await send('Page.enable')
await send('Runtime.enable')
await send('Log.enable')
await send('Network.enable')
await send('Network.setCacheDisabled', { cacheDisabled: true })

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
      assert.equal(initial.unsizedImages, 0, `${routes[index]} contains an image without intrinsic dimensions`)
      assert.equal(initial.unlabelledFields, 0, `${routes[index]} contains an unlabelled form field`)
      if (width <= 393) assert.deepEqual(initial.smallTargets, [], `${routes[index]} contains undersized mobile targets: ${JSON.stringify(initial.smallTargets)}`)
      assert.equal(initial.unnamedButtons, 0)
      if (port === 4173 && width === 393) pageHeights[routes[index]] = initial.contentHeight
      if (width === 393) {
        await navigate(null, true)
        const reloaded = await inspect()
        assert.equal(reloaded.heading, initial.heading, `${routes[index]} changed after refresh`)
      }
    }
  }
}

await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 1, mobile: true })
await send('Runtime.evaluate', { expression: `localStorage.removeItem('fashionxpress.cart.v1')` })
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
await send('Runtime.evaluate', { expression: `document.querySelector('[aria-label^="Increase Neo-Safari"]').click()` })
let { result: { value: quantityAfterIncrease } } = await send('Runtime.evaluate', { expression: `document.querySelector('.quantity-control output').value`, returnByValue: true })
assert.equal(quantityAfterIncrease, '2')
await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape' })
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' })
await new Promise((resolve) => setTimeout(resolve, 80))
let { result: { value: closedState } } = await send('Runtime.evaluate', { expression: `({ dialog: Boolean(document.querySelector('.drawer')), overflow: document.body.style.overflow, focusRestored: document.activeElement?.innerText.toLowerCase().includes('add to'), activeTag: document.activeElement?.tagName })`, returnByValue: true })
assert.deepEqual(closedState, { dialog: false, overflow: '', focusRestored: true, activeTag: 'BUTTON' })
await navigate(null, true)
await send('Runtime.evaluate', { expression: `document.querySelector('.cart-button').click()` })
let { result: { value: persistedCart } } = await send('Runtime.evaluate', { expression: `({ count: document.querySelector('.quantity-control output')?.value, badge: document.querySelector('.cart-button span')?.innerText })`, returnByValue: true })
assert.deepEqual(persistedCart, { count: '2', badge: '2' })
await send('Runtime.evaluate', { expression: `document.querySelector('.drawer .icon-button').click(); localStorage.setItem('fashionxpress.cart.v1', '{bad-json')` })
await navigate(null, true)
await send('Runtime.evaluate', { expression: `document.querySelector('.cart-button').click()` })
let { result: { value: recoveredCart } } = await send('Runtime.evaluate', { expression: `({ empty: Boolean(document.querySelector('.drawer .empty')), stored: localStorage.getItem('fashionxpress.cart.v1') })`, returnByValue: true })
assert.deepEqual(recoveredCart, { empty: true, stored: '[]' })
await send('Runtime.evaluate', { expression: `document.querySelector('.drawer .icon-button').click()` })

await navigate('http://127.0.0.1:4173/collections')
let { result: { value: filterState } } = await send('Runtime.evaluate', { expression: `({ total: document.querySelectorAll('.filter-bar button[aria-pressed]').length, selected: document.querySelectorAll('.filter-bar button[aria-pressed="true"]').length, cards: document.querySelectorAll('.collection-body .product-card').length, visibleCards: [...document.querySelectorAll('.collection-body .product-card')].filter((card) => getComputedStyle(card).display !== 'none').length })`, returnByValue: true })
assert.deepEqual(filterState, { total: 4, selected: 1, cards: 6, visibleCards: 6 })
await navigate('http://127.0.0.1:4173/ar-tryon')
let { result: { value: outfitState } } = await send('Runtime.evaluate', { expression: `({ total: document.querySelectorAll('.outfit-list button[aria-pressed]').length, selected: document.querySelectorAll('.outfit-list button[aria-pressed="true"]').length, captureDisabled: document.querySelector('.capture') === null || document.querySelector('.capture').disabled })`, returnByValue: true })
assert.deepEqual(outfitState, { total: 4, selected: 1, captureDisabled: true })

await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
let { result: { value: reducedMotionState } } = await send('Runtime.evaluate', { expression: `({ matches: matchMedia('(prefers-reduced-motion: reduce)').matches, scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior, animationName: getComputedStyle(document.querySelector('.camera-chrome span i')).animationName })`, returnByValue: true })
assert.deepEqual(reducedMotionState, { matches: true, scrollBehavior: 'auto', animationName: 'none' })
await send('Emulation.setEmulatedMedia', { features: [] })

await navigate('http://127.0.0.1:4173/community')
let { result: { value: communityLinks } } = await send('Runtime.evaluate', { expression: `[...document.querySelectorAll('.resources a')].map((link) => link.getAttribute('href'))`, returnByValue: true })
assert.deepEqual(communityLinks, ['/get-started', '/licensing', '/about#values'])
await send('Runtime.evaluate', { expression: `document.querySelector('.resources a:last-child').click()` })
await new Promise((resolve) => setTimeout(resolve, 150))
let { result: { value: hashState } } = await send('Runtime.evaluate', { expression: `({ path: location.pathname, hash: location.hash, targetExists: Boolean(document.querySelector('#values')), scrolled: scrollY > 0 })`, returnByValue: true })
assert.deepEqual(hashState, { path: '/about', hash: '#values', targetExists: true, scrolled: true })

await navigate('http://127.0.0.1:4173/')
let { result: { value: featuredState } } = await send('Runtime.evaluate', { expression: `({ cards: document.querySelectorAll('.featured-products .product-card').length, visible: [...document.querySelectorAll('.featured-products .product-card')].filter((card) => getComputedStyle(card).display !== 'none').length, scrollable: document.querySelector('.featured-products').scrollWidth > document.querySelector('.featured-products').clientWidth })`, returnByValue: true })
assert.deepEqual(featuredState, { cards: 3, visible: 3, scrollable: true })
await send('Runtime.evaluate', { expression: `document.querySelector('.mobile-menu').click()` })
await new Promise((resolve) => setTimeout(resolve, 80))
let { result: { value: navigationState } } = await send('Runtime.evaluate', { expression: `({ expanded: document.querySelector('.mobile-menu').getAttribute('aria-expanded'), hasSkipLink: Boolean(document.querySelector('a.skip-link[href="#main-content"]')) })`, returnByValue: true })
assert.deepEqual(navigationState, { expanded: 'true', hasSkipLink: true })
await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape' })
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' })
await new Promise((resolve) => setTimeout(resolve, 80))
let { result: { value: navigationClosed } } = await send('Runtime.evaluate', { expression: `document.querySelector('.mobile-menu').getAttribute('aria-expanded')`, returnByValue: true })
assert.equal(navigationClosed, 'false')

await navigate('http://127.0.0.1:4173/contact')
await new Promise((resolve) => setTimeout(resolve, 200))
let { result: { value: contactUnavailable } } = await send('Runtime.evaluate', { expression: `({ notice: document.querySelector('.service-status')?.innerText, fieldsetDisabled: document.querySelector('.editorial-form fieldset')?.disabled, submitDisabled: document.querySelector('.editorial-form button[type="submit"]')?.disabled, storage: Object.keys(localStorage).filter((key) => key !== 'fashionxpress.cart.v1') })`, returnByValue: true })
assert.deepEqual(contactUnavailable, { notice: 'Online contact submissions are not configured on this deployment.', fieldsetDisabled: true, submitDisabled: true, storage: [] })

await navigate('http://127.0.0.1:4173/get-started')
await new Promise((resolve) => setTimeout(resolve, 200))
let { result: { value: creatorUnavailable } } = await send('Runtime.evaluate', { expression: `({ notice: document.querySelector('.service-status')?.innerText, fieldsetDisabled: document.querySelector('.editorial-form fieldset')?.disabled })`, returnByValue: true })
assert.deepEqual(creatorUnavailable, { notice: 'Online creator applications are not configured on this deployment.', fieldsetDisabled: true })

await navigate('http://127.0.0.1:4173/')
await new Promise((resolve) => setTimeout(resolve, 200))
let { result: { value: newsletterUnavailable } } = await send('Runtime.evaluate', { expression: `({ notice: document.querySelector('.newsletter .service-status')?.innerText, fieldsetDisabled: document.querySelector('.newsletter fieldset')?.disabled })`, returnByValue: true })
assert.deepEqual(newsletterUnavailable, { notice: 'Online newsletter signups are not configured on this deployment.', fieldsetDisabled: true })

assert.deepEqual(browserErrors, [], `Browser console errors: ${JSON.stringify(browserErrors)}`)

socket.close()
console.log(`Browser smoke checks passed for ${routes.length} routes in development and production preview at 320–1920px, including refresh, persistence, reduced-motion, validation, dialog, and toggle-state checks.`)
console.log(`PAGE_HEIGHTS_393 ${JSON.stringify(pageHeights)}`)
