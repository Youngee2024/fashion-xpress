import assert from 'node:assert/strict'

const target = await fetch('http://127.0.0.1:9333/json/new?about:blank', { method: 'PUT' }).then((response) => response.json())
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
let requestId = 0
const pending = new Map()
const events = new Map()
const consoleIssues = []
const web3Requests = []
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data)
  if (message.id) { const request = pending.get(message.id); pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result); return }
  if (message.method === 'Runtime.exceptionThrown') consoleIssues.push(message.params.exceptionDetails?.text ?? 'Browser exception')
  if (message.method === 'Log.entryAdded' && ['error', 'warning'].includes(message.params.entry?.level)) consoleIssues.push(message.params.entry.text)
  if (message.method === 'Network.requestWillBeSent' && /(?:infura|alchemy|quicknode|etherscan|blockscout|walletconnect|ipfs|arweave)/i.test(message.params.request.url)) web3Requests.push(message.params.request.url)
  const listeners = events.get(message.method) ?? []; events.delete(message.method); listeners.forEach((resolve) => resolve(message.params))
})
function send(method, params = {}) { const id = ++requestId; socket.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })) }
function once(method) { return new Promise((resolve) => events.set(method, [...(events.get(method) ?? []), resolve])) }
async function navigate(url, reload = false) { const loaded = once('Page.loadEventFired'); reload ? await send('Page.reload', { ignoreCache: true }) : await send('Page.navigate', { url }); await loaded; await new Promise((resolve) => setTimeout(resolve, 100)) }
async function evaluate(expression) { const { result } = await send('Runtime.evaluate', { expression, returnByValue: true }); return result.value }
async function pageState() { return evaluate(`({ heading:document.querySelector('h1')?.innerText, path:location.pathname, overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth, broken:[...document.images].filter((image)=>image.complete&&image.naturalWidth===0).length, focused:document.activeElement===document.querySelector('h1'), ethereumReads:window.__fashionXpressEthereumReads??0 })`) }
async function click(text) { await evaluate(`[...document.querySelectorAll('button,a')].find((node)=>node.innerText.toLowerCase().includes(${JSON.stringify(text.toLowerCase())}))?.click()`); await new Promise((resolve) => setTimeout(resolve, 100)) }

await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable')
await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fashionXpressEthereumReads=0; try { Object.defineProperty(window,'ethereum',{configurable:true,get(){window.__fashionXpressEthereumReads+=1; return undefined}}) } catch {}` })

for (const width of [393, 1440]) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: width === 393 ? 852 : 900, deviceScaleFactor: 1, mobile: width === 393 })
  await navigate('http://127.0.0.1:4173/')
  await evaluate(`sessionStorage.removeItem('fashionxpress.demoMint.v1'); sessionStorage.removeItem('fashionxpress.demoMintAssets.v1')`)
  await navigate('http://127.0.0.1:4173/mint/neo-safari?source=product&step=review')
  let state = await pageState()
  assert.deepEqual(state, { heading: 'Metadata.', path: '/mint/neo-safari', overflow: false, broken: 0, focused: true, ethereumReads: 0 })
  assert.match(await evaluate(`document.querySelector('.mint-metadata')?.innerText`), /demo:metadata:neo-safari/)
  await click('continue to demo wallet')
  assert.equal(await evaluate(`document.querySelector('h1')?.innerText`), 'Demo Wallet.')
  assert.equal(await evaluate(`[...document.querySelectorAll('button')].find((button)=>button.innerText.includes('CONTINUE TO NETWORK'))?.disabled`), true)
  await click('activate demo wallet')
  if (width === 393) { await click('disconnect demo wallet'); await click('activate demo wallet') }
  await click('continue to network')
  await evaluate(`document.querySelectorAll('.mint-networks input')[1].click()`)
  await evaluate(`history.back()`); await new Promise((resolve) => setTimeout(resolve, 120))
  assert.equal(await evaluate(`document.querySelector('h1')?.innerText`), 'Demo Wallet.')
  await evaluate(`history.forward()`); await new Promise((resolve) => setTimeout(resolve, 120))
  assert.equal(await evaluate(`document.querySelectorAll('.mint-networks input')[1].checked`), true)
  await click('review demo mint')
  assert.equal(await evaluate(`document.querySelector('.mint-acknowledgement input').checked`), false)
  await evaluate(`document.querySelector('.mint-acknowledgement input').click()`)
  await click('complete demo mint')
  if (width === 393) {
    await click('cancel demo mint')
    assert.match(await evaluate(`document.querySelector('[role="status"]')?.innerText`), /cancelled safely/i)
    await evaluate(`document.querySelector('.mint-acknowledgement input').click()`)
    await click('complete demo mint')
  }
  await new Promise((resolve) => setTimeout(resolve, 2700))
  state = await pageState()
  assert.deepEqual(state, { heading: 'Demo mint complete.', path: '/mint/neo-safari/complete', overflow: false, broken: 0, focused: true, ethereumReads: 0 })
  const identity = await evaluate(`({ asset:document.querySelector('.demo-identifier')?.innerText, text:document.querySelector('.mint-complete')?.innerText, count:JSON.parse(sessionStorage.getItem('fashionxpress.demoMintAssets.v1')??'[]').length })`)
  assert.match(identity.asset, /^demo:asset:neo-safari:[A-F0-9]{8}$/)
  assert.match(identity.text, /Not on-chain/)
  assert.equal(identity.count, 1)
  await navigate(null, true)
  assert.equal((await pageState()).heading, 'Demo mint complete.')
  await click('view legacy collectible record')
  assert.equal(await evaluate(`document.querySelector('h1')?.innerText`), 'Digital Wardrobe.')
  assert.match(await evaluate(`document.querySelector('.vault-asset')?.innerText`), /Not on-chain/)
  assert.equal((await pageState()).overflow, false)
}

assert.deepEqual(web3Requests, [])
assert.deepEqual(consoleIssues, [])
socket.close()
console.log('Phase 6 browser journey passed at 393px and 1440px with zero Web3 requests, console issues, broken images, or horizontal overflow.')
