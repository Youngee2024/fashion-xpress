import assert from 'node:assert/strict'

const routes = ['/', '/collections', '/collections/neo-safari', '/checkout', '/demo-collection', '/ar-tryon', '/community', '/community/demo-1', '/auth', '/profile/runwayguest', '/community-guidelines', '/about', '/contact', '/get-started', '/mint/neo-safari', '/privacy', '/terms', '/licensing', '/refund-policy', '/accessibility', '/newsletter/confirm', '/newsletter/unsubscribe', '/definitely-missing']
const widths = [320, 375, 393, 768, 1024, 1440, 1920]
const expectedHeadings = ['Wear the', 'Digital pieces.', 'Neo-Safari 2026', 'Bag review.', 'Demo Vault.', 'Style it locally.', 'Ideas look better', 'How do I price', 'Enter the demo community.', 'Runway Guest', 'Make room for ideas.', 'African creativity,', 'Message', 'Bring what', 'Metadata.', 'Privacy, in plain language.', 'Terms for exploring', 'Digital fashion licensing.', 'Purchases are unavailable.', 'Designed for more ways', 'Confirm your place.', 'Leave the list.', 'Off the runway.']

const target = await fetch('http://127.0.0.1:9333/json/new?about:blank', { method: 'PUT' }).then((response) => response.json())
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

let requestId = 0
const pending = new Map()
const pageHeights = {}
const browserErrors = []
const apiRequests = []
const supabaseRequests = []
const paymentRequests = []
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
  if (message.method === 'Network.requestWillBeSent' && new URL(message.params.request.url).pathname.startsWith('/api/')) apiRequests.push(message.params.request.url)
  if (message.method === 'Network.requestWillBeSent' && /supabase\.co/.test(message.params.request.url)) supabaseRequests.push(message.params.request.url)
  if (message.method === 'Network.requestWillBeSent' && /paystack|flutterwave|stripe|checkout\.com/i.test(message.params.request.url)) paymentRequests.push(message.params.request.url)
  if (message.method === 'Log.entryAdded' && ['error', 'warning'].includes(message.params.entry?.level)) browserErrors.push(`${message.params.entry.text} ${message.params.entry.url ?? ''}`.trim())
})

function send(method, params = {}) {
  const id = ++requestId
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
}

async function navigate(url, reload = false) {
  const before = await send('Runtime.evaluate', { expression: `({ href: location.href, timeOrigin: performance.timeOrigin })`, returnByValue: true })
  if (reload) await send('Page.reload', { ignoreCache: true })
  else await send('Page.navigate', { url })
  await new Promise((resolve) => setTimeout(resolve, 75))
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const { result } = await send('Runtime.evaluate', { expression: `({ ready: document.readyState, heading: Boolean(document.querySelector('h1')), href: location.href, timeOrigin: performance.timeOrigin })`, returnByValue: true })
    const changedDocument = result.value?.timeOrigin !== before.result.value?.timeOrigin || result.value?.href !== before.result.value?.href
    if (changedDocument && result.value?.ready !== 'loading' && result.value?.heading) return
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error(`Timed out waiting for a page heading after ${reload ? 'reload' : `navigation to ${url}`}.`)
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
      smallTargets: [...document.querySelectorAll('a[href],button,input,select,textarea')].filter((target) => { const rect = target.getBoundingClientRect(); const labelRect = target.closest('label')?.getBoundingClientRect(); const hasLargeLabel = labelRect && labelRect.width >= 44 && labelRect.height >= 44; return rect.width > 0 && rect.height > 0 && !hasLargeLabel && (rect.width < 44 || rect.height < 44) }).slice(0, 8).map((target) => ({ tag:target.tagName, className:target.className, text:target.innerText?.trim().slice(0,30), width:target.getBoundingClientRect().width, height:target.getBoundingClientRect().height })),
      unnamedButtons: [...document.querySelectorAll('button')].filter((button) => !button.disabled && !button.innerText.trim() && !button.getAttribute('aria-label')).length
    })`,
    returnByValue: true,
  })
  return result.value
}

async function assertMobileState(label) {
  const state = await inspect()
  assert.equal(state.overflow, false, `${label} overflowed on mobile: ${JSON.stringify(state.overflowElements)}`)
  assert.equal(state.brokenImages, 0, `${label} contains a broken image`)
  assert.equal(state.unsizedImages, 0, `${label} contains an unsized image`)
  assert.deepEqual(state.smallTargets, [], `${label} contains undersized mobile targets: ${JSON.stringify(state.smallTargets)}`)
}

await send('Page.enable')
await send('Runtime.enable')
await send('Log.enable')
await send('Network.enable')
await send('Network.setCacheDisabled', { cacheDisabled: true })

for (const port of [5173, 4173]) {
  await navigate(`http://127.0.0.1:${port}/`)
  await send('Runtime.evaluate', { expression: `localStorage.removeItem('fashionxpress.cart.v1'); sessionStorage.removeItem('fashionxpress.demoCheckout.v1'); sessionStorage.removeItem('fashionxpress.demoCollection.v1')` })
  const testedWidths = port === 5173 ? [393, 1440] : widths
  for (const width of testedWidths) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: width < 600 ? 852 : 900, deviceScaleFactor: 1, mobile: width < 600 })
    for (let index = 0; index < routes.length; index += 1) {
      await navigate(`http://127.0.0.1:${port}${routes[index]}`)
      let initial = await inspect()
      if (!initial.heading || initial.heading.includes('connection was interrupted')) {
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
await send('Runtime.evaluate', { expression: `localStorage.removeItem('fashionxpress.cart.v1'); sessionStorage.removeItem('fashionxpress.demoCheckout.v1'); sessionStorage.removeItem('fashionxpress.demoCollection.v1')` })
await navigate('http://127.0.0.1:4173/collections/neo-safari')
await send('Runtime.evaluate', { expression: `document.querySelector('.detail-actions button').focus(); document.querySelector('.detail-actions button').click()` })
await new Promise((resolve) => setTimeout(resolve, 250))
let { result: { value: cartState } } = await send('Runtime.evaluate', { expression: `({ role: document.querySelector('.drawer')?.getAttribute('role'), modal: document.querySelector('.drawer')?.getAttribute('aria-modal'), label: document.querySelector('.drawer')?.getAttribute('aria-labelledby'), closeName: document.querySelector('.drawer .icon-button')?.getAttribute('aria-label'), overflow: document.body.style.overflow, activeName: document.activeElement?.getAttribute('aria-label') })`, returnByValue: true })
assert.deepEqual(cartState, { role: 'dialog', modal: 'true', label: 'cart-title', closeName: 'Close shopping bag', overflow: 'hidden', activeName: 'Close shopping bag' })
await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', modifiers: 8 })
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', modifiers: 8 })
let { result: { value: trappedAtEnd } } = await send('Runtime.evaluate', { expression: `document.activeElement?.innerText`, returnByValue: true })
assert.equal(trappedAtEnd.toLowerCase(), 'proceed to demo checkout')
await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab' })
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab' })
let { result: { value: trappedAtStart } } = await send('Runtime.evaluate', { expression: `document.activeElement?.getAttribute('aria-label')`, returnByValue: true })
assert.equal(trappedAtStart, 'Close shopping bag')
await send('Runtime.evaluate', { expression: `document.querySelector('.remove-item').click()` })
await new Promise((resolve) => setTimeout(resolve, 80))
let { result: { value: removedState } } = await send('Runtime.evaluate', { expression: `({ empty: Boolean(document.querySelector('.drawer .empty')), stored: localStorage.getItem('fashionxpress.cart.v1') })`, returnByValue: true })
assert.deepEqual(removedState, { empty: true, stored: '[]' })
await send('Runtime.evaluate', { expression: `document.querySelector('.drawer .icon-button').click()` })
await new Promise((resolve) => setTimeout(resolve, 80))
await send('Runtime.evaluate', { expression: `document.querySelector('.detail-actions button').click()` })
await new Promise((resolve) => setTimeout(resolve, 80))
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
await send('Runtime.evaluate', { expression: `document.querySelector('.drawer-total .button').click()` })
await new Promise((resolve) => setTimeout(resolve, 150))
let { result: { value: bagReview } } = await send('Runtime.evaluate', { expression: `({ path: location.pathname, step: new URLSearchParams(location.search).get('step'), heading: document.querySelector('h1')?.innerText, quantity: document.querySelector('.checkout-quantity output')?.value, focused: document.activeElement === document.querySelector('h1') })`, returnByValue: true })
assert.deepEqual(bagReview, { path: '/checkout', step: 'bag', heading: 'Bag review.', quantity: '2', focused: true })
await assertMobileState('Checkout bag review')

await navigate('http://127.0.0.1:4173/checkout?step=review')
let { result: { value: guardedStep } } = await send('Runtime.evaluate', { expression: `({ step: new URLSearchParams(location.search).get('step'), heading: document.querySelector('h1')?.innerText })`, returnByValue: true })
assert.deepEqual(guardedStep, { step: 'bag', heading: 'Bag review.' })

await send('Runtime.evaluate', { expression: `document.querySelector('.checkout-controls .button:not(.ghost)').click()` })
await new Promise((resolve) => setTimeout(resolve, 80))
let { result: { value: ownershipStep } } = await send('Runtime.evaluate', { expression: `({ heading: document.querySelector('h1')?.innerText, focused: document.activeElement === document.querySelector('h1'), fields: document.querySelectorAll('input').length, personalFields: document.querySelectorAll('input[type="text"],input[type="email"],input[type="tel"]').length })`, returnByValue: true })
assert.deepEqual(ownershipStep, { heading: 'Digital identity.', focused: true, fields: 2, personalFields: 0 })
await assertMobileState('Checkout ownership step')
await send('Runtime.evaluate', { expression: `document.querySelector('.checkout-options input[value]')?.click?.() ?? document.querySelector('.checkout-options input').click()` })
await send('Runtime.evaluate', { expression: `document.querySelector('.checkout-controls .button:not(.ghost)').click()` })
await new Promise((resolve) => setTimeout(resolve, 80))
await send('Runtime.evaluate', { expression: `document.querySelectorAll('.checkout-options')[0].querySelectorAll('input')[1].click()` })
let { result: { value: licenceTotal } } = await send('Runtime.evaluate', { expression: `({ heading: document.querySelector('h1')?.innerText, subtotal: document.querySelectorAll('.checkout-totals dd')[0]?.innerText, adjustment: document.querySelectorAll('.checkout-totals dd')[1]?.innerText, total: document.querySelectorAll('.checkout-totals dd')[2]?.innerText })`, returnByValue: true })
assert.deepEqual(licenceTotal, { heading: 'Concept licences.', subtotal: '5.0 concept ETH', adjustment: '1.0 concept ETH', total: '6.0 concept ETH' })
await assertMobileState('Checkout licence step')

await send('Runtime.evaluate', { expression: `history.back()` })
await new Promise((resolve) => setTimeout(resolve, 100))
let { result: { value: backHeading } } = await send('Runtime.evaluate', { expression: `document.querySelector('h1')?.innerText`, returnByValue: true })
assert.equal(backHeading, 'Digital identity.')
await send('Runtime.evaluate', { expression: `history.forward()` })
await new Promise((resolve) => setTimeout(resolve, 100))
let { result: { value: forwardState } } = await send('Runtime.evaluate', { expression: `({ heading: document.querySelector('h1')?.innerText, selected: document.querySelectorAll('.checkout-options')[0].querySelectorAll('input')[1].checked })`, returnByValue: true })
assert.deepEqual(forwardState, { heading: 'Concept licences.', selected: true })

await send('Runtime.evaluate', { expression: `document.querySelector('.checkout-controls .button:not(.ghost)').click()` })
await new Promise((resolve) => setTimeout(resolve, 80))
let { result: { value: paymentState } } = await send('Runtime.evaluate', { expression: `({ heading: document.querySelector('h1')?.innerText, credentialFields: document.querySelectorAll('input').length, disclosure: document.querySelector('.checkout-disclosure')?.innerText })`, returnByValue: true })
assert.equal(paymentState.heading, 'Payment demo.')
assert.equal(paymentState.credentialFields, 0)
assert.match(paymentState.disclosure, /No payment will be taken/)
assert.match(paymentState.disclosure, /No personal information will be transmitted/)
await assertMobileState('Checkout payment step')
await send('Runtime.evaluate', { expression: `document.querySelector('.checkout-controls .button:not(.ghost)').click()` })
await new Promise((resolve) => setTimeout(resolve, 80))
let { result: { value: reviewState } } = await send('Runtime.evaluate', { expression: `({ heading: document.querySelector('h1')?.innerText, action: document.querySelector('.checkout-controls .button:not(.ghost)')?.innerText, licences: [...document.querySelectorAll('.checkout-item p')].some((node) => node.innerText.includes('Social and content use')) })`, returnByValue: true })
assert.deepEqual(reviewState, { heading: 'Final review.', action: 'COMPLETE DEMO CHECKOUT', licences: true })
await assertMobileState('Checkout final review')

await send('Runtime.evaluate', { expression: `const completeButton = document.querySelector('.checkout-controls .button:not(.ghost)'); completeButton.click(); completeButton.click()` })
await new Promise((resolve) => setTimeout(resolve, 150))
let { result: { value: completedState } } = await send('Runtime.evaluate', { expression: `({ path: location.pathname, heading: document.querySelector('h1')?.innerText, receiptCount: JSON.parse(sessionStorage.getItem('fashionxpress.demoCollection.v1') ?? '[]').length, cart: localStorage.getItem('fashionxpress.cart.v1'), message: document.querySelector('.checkout-complete>p')?.innerText })`, returnByValue: true })
assert.deepEqual(completedState, { path: '/checkout/complete', heading: 'Demo checkout complete.', receiptCount: 1, cart: '[]', message: 'No payment was taken. No real order was created. No digital ownership or licence was transferred.' })
await assertMobileState('Checkout completion')
await navigate(null, true)
let { result: { value: refreshedReceipt } } = await send('Runtime.evaluate', { expression: `document.querySelector('h1')?.innerText`, returnByValue: true })
assert.equal(refreshedReceipt, 'Demo checkout complete.')
await send('Runtime.evaluate', { expression: `document.querySelector('.checkout-controls .button').click()` })
await new Promise((resolve) => setTimeout(resolve, 100))
let { result: { value: vaultState } } = await send('Runtime.evaluate', { expression: `({ path: location.pathname, cards: document.querySelectorAll('.vault-group .vault-piece').length, productLink: document.querySelector('.vault-group .vault-piece a')?.getAttribute('href'), onlineClaim: document.querySelector('.demo-vault>p')?.innerText })`, returnByValue: true })
assert.equal(vaultState.path, '/demo-collection')
assert.equal(vaultState.cards, 1)
assert.equal(vaultState.productLink, '/collections/neo-safari')
assert.match(vaultState.onlineClaim, /nothing is owned, minted, licensed.*stored online.*on-chain/i)
await assertMobileState('Demo Collection')
await send('Runtime.evaluate', { expression: `window.confirm = () => true; document.querySelector('.demo-vault .button.ghost').click()` })
let { result: { value: resetState } } = await send('Runtime.evaluate', { expression: `({ empty: Boolean(document.querySelector('.checkout-empty')), stored: sessionStorage.getItem('fashionxpress.demoCollection.v1') })`, returnByValue: true })
assert.deepEqual(resetState, { empty: true, stored: null })

await navigate('http://127.0.0.1:4173/checkout/complete')
await new Promise((resolve) => setTimeout(resolve, 80))
let { result: { value: incompleteReceiptRecovery } } = await send('Runtime.evaluate', { expression: `({ path: location.pathname, step: new URLSearchParams(location.search).get('step'), heading: document.querySelector('h1')?.innerText })`, returnByValue: true })
assert.deepEqual(incompleteReceiptRecovery, { path: '/checkout', step: 'bag', heading: 'Bag review.' })

await send('Runtime.evaluate', { expression: `localStorage.setItem('fashionxpress.cart.v1', '{bad-json')` })
await navigate(null, true)
await send('Runtime.evaluate', { expression: `document.querySelector('.cart-button').click()` })
let { result: { value: recoveredCart } } = await send('Runtime.evaluate', { expression: `({ empty: Boolean(document.querySelector('.drawer .empty')), stored: localStorage.getItem('fashionxpress.cart.v1') })`, returnByValue: true })
assert.deepEqual(recoveredCart, { empty: true, stored: '[]' })
await send('Runtime.evaluate', { expression: `document.querySelector('.drawer .icon-button').click()` })

await navigate('http://127.0.0.1:4173/collections')
let { result: { value: filterState } } = await send('Runtime.evaluate', { expression: `({ total: document.querySelectorAll('.filter-bar button[aria-pressed]').length, selected: document.querySelectorAll('.filter-bar button[aria-pressed="true"]').length, cards: document.querySelectorAll('.collection-body .product-card').length, visibleCards: [...document.querySelectorAll('.collection-body .product-card')].filter((card) => getComputedStyle(card).display !== 'none').length })`, returnByValue: true })
assert.deepEqual(filterState, { total: 4, selected: 1, cards: 6, visibleCards: 6 })
await navigate('http://127.0.0.1:4173/ar-tryon')
let { result: { value: outfitState } } = await send('Runtime.evaluate', { expression: `({ total: document.querySelectorAll('.tryon-garments button[aria-pressed]').length, selected: document.querySelectorAll('.tryon-garments button[aria-pressed="true"]').length, captureDisabled: document.querySelector('.tryon-capture') === null || document.querySelector('.tryon-capture').disabled })`, returnByValue: true })
assert.deepEqual(outfitState, { total: 6, selected: 1, captureDisabled: true })

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
let { result: { value: contactDemo } } = await send('Runtime.evaluate', { expression: `({ indicator: document.querySelector('.portfolio-demo-indicator')?.innerText, fieldsetDisabled: document.querySelector('.editorial-form fieldset')?.disabled, submitDisabled: document.querySelector('.editorial-form button[type="submit"]')?.disabled, storage: Object.keys(localStorage).filter((key) => key !== 'fashionxpress.cart.v1') })`, returnByValue: true })
assert.deepEqual(contactDemo, { indicator: 'PORTFOLIO DEMO', fieldsetDisabled: false, submitDisabled: false, storage: [] })
await send('Runtime.evaluate', { expression: `document.querySelector('.editorial-form button[type="submit"]').click()` })
let { result: { value: contactValidation } } = await send('Runtime.evaluate', { expression: `document.querySelector('#contact-name-error')?.innerText`, returnByValue: true })
assert.match(contactValidation, /required/)
await send('Runtime.evaluate', { expression: `(() => { const set = (selector, value) => { const element = document.querySelector(selector); const setter = Object.getOwnPropertyDescriptor(element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : element.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set; setter.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true })); }; set('#contact-name', 'Portfolio Visitor'); set('#contact-email', 'visitor@example.test'); set('#contact-topic', 'Press'); set('#contact-message', 'This is a complete demo contact message.'); document.querySelector('#contact-consent').click(); })()` })
await send('Runtime.evaluate', { expression: `const button = document.querySelector('.editorial-form button[type="submit"]'); button.click(); button.click()` })
let { result: { value: contactBusy } } = await send('Runtime.evaluate', { expression: `({ busy: document.querySelector('.editorial-form')?.getAttribute('aria-busy'), disabled: document.querySelector('.editorial-form button[type="submit"]')?.disabled })`, returnByValue: true })
assert.deepEqual(contactBusy, { busy: 'true', disabled: true })
await new Promise((resolve) => setTimeout(resolve, 450))
let { result: { value: contactComplete } } = await send('Runtime.evaluate', { expression: `document.querySelector('.workflow-success h2')?.innerText`, returnByValue: true })
assert.equal(contactComplete, 'Demo complete—your message was not sent.')
await send('Runtime.evaluate', { expression: `document.querySelector('.workflow-success button').click()` })
let { result: { value: contactCleared } } = await send('Runtime.evaluate', { expression: `({ value: document.querySelector('#contact-email')?.value, local: JSON.stringify(localStorage), session: JSON.stringify(sessionStorage), cookie: document.cookie })`, returnByValue: true })
assert.equal(contactCleared.value, '')
assert.doesNotMatch(JSON.stringify(contactCleared), /visitor@example\.test/)

await navigate('http://127.0.0.1:4173/get-started')
await new Promise((resolve) => setTimeout(resolve, 200))
let { result: { value: creatorDemo } } = await send('Runtime.evaluate', { expression: `({ indicator: document.querySelector('.portfolio-demo-indicator')?.innerText, fieldsetDisabled: document.querySelector('.editorial-form fieldset')?.disabled })`, returnByValue: true })
assert.deepEqual(creatorDemo, { indicator: 'PORTFOLIO DEMO', fieldsetDisabled: false })
await send('Runtime.evaluate', { expression: `(() => { const set = (selector, value) => { const element = document.querySelector(selector); const setter = Object.getOwnPropertyDescriptor(element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : element.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set; setter.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true })); }; set('#creator-name', 'Portfolio Creator'); set('#creator-email', 'creator@example.test'); set('#creator-location', 'Lagos'); set('#creator-portfolio', 'https://example.test/work'); set('#creator-specialty', 'Virtual couture'); set('#creator-vision', 'I build thoughtful digital garments for expressive virtual worlds.'); document.querySelector('#creator-consent').click(); document.querySelector('.editorial-form button[type="submit"]').click(); })()` })
await new Promise((resolve) => setTimeout(resolve, 450))
let { result: { value: creatorComplete } } = await send('Runtime.evaluate', { expression: `document.querySelector('.workflow-success h2')?.innerText`, returnByValue: true })
assert.equal(creatorComplete, 'Demo complete—your application was not submitted.')
await send('Runtime.evaluate', { expression: `document.querySelector('.workflow-success button').click()` })
let { result: { value: creatorCleared } } = await send('Runtime.evaluate', { expression: `({ value: document.querySelector('#creator-email')?.value, local: JSON.stringify(localStorage), session: JSON.stringify(sessionStorage), cookie: document.cookie })`, returnByValue: true })
assert.equal(creatorCleared.value, '')
assert.doesNotMatch(JSON.stringify(creatorCleared), /creator@example\.test/)

await navigate('http://127.0.0.1:4173/')
await new Promise((resolve) => setTimeout(resolve, 200))
let { result: { value: newsletterDemo } } = await send('Runtime.evaluate', { expression: `({ indicator: document.querySelector('.newsletter .portfolio-demo-indicator')?.innerText, fieldsetDisabled: document.querySelector('.newsletter fieldset')?.disabled })`, returnByValue: true })
assert.deepEqual(newsletterDemo, { indicator: 'PORTFOLIO DEMO', fieldsetDisabled: false })
await send('Runtime.evaluate', { expression: `(() => { const element = document.querySelector('#newsletter-email'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, 'newsletter@example.test'); element.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('#newsletter-consent').click(); document.querySelector('.newsletter button[type="submit"]').click(); })()` })
await new Promise((resolve) => setTimeout(resolve, 450))
let { result: { value: newsletterComplete } } = await send('Runtime.evaluate', { expression: `document.querySelector('.newsletter-result h3')?.innerText`, returnByValue: true })
assert.equal(newsletterComplete, 'Demo complete—your email was not subscribed.')
await send('Runtime.evaluate', { expression: `document.querySelector('.newsletter-result button').click()` })
let { result: { value: newsletterCleared } } = await send('Runtime.evaluate', { expression: `({ value: document.querySelector('#newsletter-email')?.value, local: JSON.stringify(localStorage), session: JSON.stringify(sessionStorage), cookie: document.cookie })`, returnByValue: true })
assert.equal(newsletterCleared.value, '')
assert.doesNotMatch(JSON.stringify(newsletterCleared), /newsletter@example\.test/)

await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await navigate('http://127.0.0.1:4173/collections/quantum-lace')
await send('Runtime.evaluate', { expression: `localStorage.removeItem('fashionxpress.cart.v1'); sessionStorage.removeItem('fashionxpress.demoCheckout.v1'); sessionStorage.removeItem('fashionxpress.demoCollection.v1'); document.querySelector('.detail-actions button').click()` })
await new Promise((resolve) => setTimeout(resolve, 100))
await send('Runtime.evaluate', { expression: `document.querySelector('.drawer-total .button').click()` })
for (let stepIndex = 0; stepIndex < 4; stepIndex += 1) {
  await new Promise((resolve) => setTimeout(resolve, 80))
  await send('Runtime.evaluate', { expression: `document.querySelector('.checkout-controls .button:not(.ghost)').click()` })
}
await new Promise((resolve) => setTimeout(resolve, 80))
await send('Runtime.evaluate', { expression: `document.querySelector('.checkout-controls .button:not(.ghost)').click()` })
await new Promise((resolve) => setTimeout(resolve, 100))
let { result: { value: desktopCheckout } } = await send('Runtime.evaluate', { expression: `({ path: location.pathname, heading: document.querySelector('h1')?.innerText, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length, receiptCount: JSON.parse(sessionStorage.getItem('fashionxpress.demoCollection.v1') ?? '[]').length })`, returnByValue: true })
assert.deepEqual(desktopCheckout, { path: '/checkout/complete', heading: 'Demo checkout complete.', overflow: false, brokenImages: 0, receiptCount: 1 })

assert.deepEqual(apiRequests, [], `Demo Mode made API requests: ${apiRequests.join(', ')}`)
assert.deepEqual(supabaseRequests, [], `Demo Mode made Supabase requests: ${supabaseRequests.join(', ')}`)
assert.deepEqual(paymentRequests, [], `Demo checkout contacted a payment provider: ${paymentRequests.join(', ')}`)

assert.deepEqual(browserErrors, [], `Browser console errors: ${JSON.stringify(browserErrors)}`)

socket.close()
console.log(`Browser smoke checks passed for ${routes.length} routes in development and production preview at 320–1920px, including refresh, persistence, reduced-motion, validation, dialog, and toggle-state checks.`)
console.log(`PAGE_HEIGHTS_393 ${JSON.stringify(pageHeights)}`)
