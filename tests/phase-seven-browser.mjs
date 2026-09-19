import assert from 'node:assert/strict'

const target = await fetch('http://127.0.0.1:9333/json/new?about:blank', { method: 'PUT' }).then((response) => response.json())
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
let requestId = 0
const pending = new Map()
const events = new Map()
const consoleIssues = []
const externalRequests = []
const uploadRequests = []
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data)
  if (message.id) { const request = pending.get(message.id); pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result); return }
  if (message.method === 'Runtime.exceptionThrown') consoleIssues.push(message.params.exceptionDetails?.text ?? 'Browser exception')
  if (message.method === 'Log.entryAdded' && ['error', 'warning'].includes(message.params.entry?.level)) consoleIssues.push(message.params.entry.text)
  if (message.method === 'Network.requestWillBeSent') {
    const request = message.params.request
    const url = new URL(request.url)
    if (!['127.0.0.1', 'localhost'].includes(url.hostname) && !request.url.startsWith('blob:')) externalRequests.push(request.url)
    if (!['GET', 'OPTIONS'].includes(request.method)) uploadRequests.push(`${request.method} ${request.url}`)
  }
  const listeners = events.get(message.method) ?? []; events.delete(message.method); listeners.forEach((resolve) => resolve(message.params))
})
function send(method, params = {}) { const id = ++requestId; socket.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })) }
function once(method) { return new Promise((resolve) => events.set(method, [...(events.get(method) ?? []), resolve])) }
async function navigate(url) { const loaded = once('Page.loadEventFired'); await send('Page.navigate', { url }); await loaded; await new Promise((resolve) => setTimeout(resolve, 120)) }
async function evaluate(expression) { const { result } = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result?.value ?? result.value }
async function click(text) { await evaluate(`[...document.querySelectorAll('button,a,label')].find((node)=>node.innerText.toLowerCase().includes(${JSON.stringify(text.toLowerCase())}))?.click()`); await new Promise((resolve) => setTimeout(resolve, 120)) }
async function state() { return evaluate(`({ heading:document.querySelector('h1')?.innerText, overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth, broken:[...document.images].filter((image)=>image.complete&&image.naturalWidth===0).length, small:[...document.querySelectorAll('button,a[href],input')].filter((node)=>{const r=node.getBoundingClientRect();const l=node.closest('label')?.getBoundingClientRect();return r.width>0&&r.height>0&&!(l&&l.width>=44&&l.height>=44)&&(r.width<44||r.height<44)}).length })`) }

await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable')
await send('Page.addScriptToEvaluateOnNewDocument', { source: `
  window.__cameraMode='ok'; window.__cameraRequests=0; window.__trackStops=0; window.__urlCreated=0; window.__urlRevoked=0;
  const originalCreate=URL.createObjectURL.bind(URL), originalRevoke=URL.revokeObjectURL.bind(URL);
  URL.createObjectURL=(value)=>{window.__urlCreated+=1; return originalCreate(value)};
  URL.revokeObjectURL=(value)=>{window.__urlRevoked+=1; return originalRevoke(value)};
  const devices={
    async getUserMedia(){ window.__cameraRequests+=1; if(window.__cameraMode==='deny') throw new DOMException('Denied','NotAllowedError'); const stream=new MediaStream(); const track={stop(){window.__trackStops+=1}}; Object.defineProperty(stream,'getTracks',{value:()=>[track]}); return stream },
    async enumerateDevices(){ return [{kind:'videoinput'},{kind:'videoinput'}] }
  };
  try { Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:devices}) } catch {}
` })

for (const width of [393, 1440]) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: width === 393 ? 852 : 900, deviceScaleFactor: 1, mobile: width === 393 })
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  if (width === 393) {
    await navigate('http://127.0.0.1:5173/ar-tryon?product=unknown-product')
    assert.match(await evaluate(`document.querySelector('[role="status"]')?.innerText`), /Unknown garment recovered/)
  }
  await navigate('http://127.0.0.1:5173/ar-tryon?product=quantum-lace')
  const initialState = await state()
  assert.deepEqual({ heading: initialState.heading, overflow: initialState.overflow, broken: initialState.broken }, { heading: 'Style it locally.', overflow: false, broken: 0 })
  if (width === 393) assert.equal(initialState.small, 0)
  assert.equal(await evaluate(`document.querySelector('.tryon-garments button[aria-pressed="true"] span')?.innerText`), 'Quantum Lace')
  if (width === 393) {
    const firstAction = await evaluate(`document.querySelector('.tryon-source-actions')?.getBoundingClientRect().bottom`)
    assert.ok(firstAction <= 852, `Mobile source action ended below the first viewport at ${firstAction}px`)
    await click('use camera')
    assert.equal(await evaluate(`document.querySelector('.camera-chrome span')?.innerText`), 'CAMERA ACTIVE')
    assert.equal(await evaluate(`window.__cameraRequests`), 1)
    await click('use rear camera')
    assert.ok(await evaluate(`window.__trackStops`) >= 1)
    await click('stop camera')
    assert.ok(await evaluate(`window.__trackStops`) >= 2)
    await evaluate(`window.__cameraMode='deny'`)
    await click('use camera')
    assert.match(await evaluate(`document.querySelector('[role="alert"]')?.innerText`), /permission was denied/i)
    await evaluate(`window.__cameraMode='ok'`)
  }
  await evaluate(`(async()=>{const response=await fetch('/images/camera.jpg');const blob=await response.blob();const file=new File([blob],'local-photo.jpg',{type:'image/jpeg'});const transfer=new DataTransfer();transfer.items.add(file);const input=document.querySelector('input[type="file"]');Object.defineProperty(input,'files',{configurable:true,value:transfer.files});input.dispatchEvent(new Event('change',{bubbles:true}));})()`)
  await new Promise((resolve) => setTimeout(resolve, 350))
  assert.match(await evaluate(`document.querySelector('.tryon-status')?.innerText`), /Local photo ready/)
  const originalLeft = await evaluate(`document.querySelector('.tryon-garment')?.style.left`)
  await evaluate(`document.querySelector('.tryon-garment').focus()`)
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowRight', code: 'ArrowRight' })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight' })
  assert.notEqual(await evaluate(`document.querySelector('.tryon-garment')?.style.left`), originalLeft)
  await evaluate(`const slider=document.querySelector('.tryon-controls input[type="range"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(slider,'135');slider.dispatchEvent(new Event('input',{bubbles:true}));slider.dispatchEvent(new Event('change',{bubbles:true}))`)
  assert.equal(await evaluate(`document.querySelector('.tryon-controls output')?.innerText`), '135%')
  await evaluate(`document.querySelector('.tryon-capture').click()`)
  await new Promise((resolve) => setTimeout(resolve, 500))
  assert.match(await evaluate(`document.querySelector('.tryon-status')?.innerText`), /composition captured/)
  assert.equal(await evaluate(`document.querySelector('.tryon-result-actions a')?.getAttribute('download')`), 'fashionxpress-quantum-lace-preview.jpg')
  assert.equal(await evaluate(`Boolean(document.querySelector('.tryon-source[src^="blob:"]'))`), true)
  await click('retake')
  assert.match(await evaluate(`document.querySelector('.tryon-status')?.innerText`), /photo restored/)
  await evaluate(`document.querySelector('.tryon-capture').click()`)
  await new Promise((resolve) => setTimeout(resolve, 350))
  await click('reset experience')
  const cleanup = await evaluate(`({ created:window.__urlCreated, revoked:window.__urlRevoked, source:Boolean(document.querySelector('.tryon-source[src^="blob:"]')), local:JSON.stringify(localStorage), session:JSON.stringify(sessionStorage) })`)
  assert.ok(cleanup.created >= 3)
  assert.equal(cleanup.revoked, cleanup.created)
  assert.equal(cleanup.source, false)
  assert.doesNotMatch(`${cleanup.local}${cleanup.session}`, /blob:|data:image|local-photo\.jpg/)
  const resetState = await state()
  assert.deepEqual({ heading: resetState.heading, overflow: resetState.overflow, broken: resetState.broken }, { heading: 'Style it locally.', overflow: false, broken: 0 })
  if (width === 393) assert.equal(resetState.small, 0)
}

assert.deepEqual(externalRequests, [])
assert.deepEqual(uploadRequests, [])
assert.deepEqual(consoleIssues, [])
socket.close()
console.log('Phase 7 browser journey passed at 393px and 1440px with local capture, cleanup, zero uploads, no console errors, and no horizontal overflow.')
