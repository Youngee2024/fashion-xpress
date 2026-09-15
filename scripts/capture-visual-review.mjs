import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

const outputName = process.argv[2] ?? 'final'
if (!/^[a-z0-9][a-z0-9-]*$/i.test(outputName)) throw new Error('Screenshot output name must be a simple letter, number, or hyphen slug.')
const reviewRoot = resolve('review-artifacts', 'phase2-visual-review')
const outputRoot = resolve(reviewRoot, outputName)
if (!outputRoot.startsWith(`${reviewRoot}\\`)) throw new Error('Screenshot output must remain inside the visual-review directory.')
const routes = [
  ['home', '/'],
  ['collections', '/collections'],
  ['product-detail', '/collections/neo-safari'],
  ['ar-concept', '/ar-tryon'],
  ['community', '/community'],
  ['about', '/about'],
  ['contact', '/contact'],
  ['creator-application', '/get-started'],
  ['mint-prototype', '/mint/neo-safari'],
]

const target = await fetch('http://127.0.0.1:9333/json/new?about:blank', { method: 'PUT' }).then((response) => response.json())
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolveSocket, reject) => {
  socket.addEventListener('open', resolveSocket, { once: true })
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
  listeners.forEach((listener) => listener(message.params))
})

function send(method, params = {}) {
  const id = ++requestId
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolveRequest, reject) => pending.set(id, { resolve: resolveRequest, reject }))
}

function once(method) {
  return new Promise((resolveEvent) => events.set(method, [...(events.get(method) ?? []), resolveEvent]))
}

async function navigate(path) {
  const loaded = once('Page.loadEventFired')
  await send('Page.navigate', { url: `http://127.0.0.1:5173${path}` })
  await loaded
  await send('Runtime.evaluate', {
    expression: `(async () => {
      await document.fonts.ready;
      await Promise.all([...document.querySelectorAll('img')].map((image) => new Promise((resolveImage) => {
        const source = image.currentSrc || image.src;
        const preload = new Image();
        preload.addEventListener('load', () => { image.loading = 'eager'; image.src = source; resolveImage(); }, { once:true });
        preload.addEventListener('error', resolveImage, { once:true });
        preload.src = source;
      })));
      for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
        window.scrollTo({ top:y, left:0, behavior:'instant' });
        await new Promise((resolve) => setTimeout(resolve, 35));
      }
      await Promise.all([...document.images].map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => { image.addEventListener('load', resolve, { once:true }); image.addEventListener('error', resolve, { once:true }); })));
      document.activeElement?.blur();
    })()`,
    awaitPromise: true,
  })
  await send('Runtime.evaluate', { expression: `window.scrollTo({ top:0, left:0, behavior:'instant' }); document.documentElement.scrollTop = 0; document.body.scrollTop = 0;` })
  await new Promise((resolveWait) => setTimeout(resolveWait, 120))
}

async function capture(path) {
  const { data } = await send('Page.captureScreenshot', { format: 'png', fromSurface: true })
  writeFileSync(path, Buffer.from(data, 'base64'))
}

async function captureFullPage(path, viewportWidth, viewportHeight) {
  await send('Runtime.evaluate', { expression: `(() => { const style = document.createElement('style'); style.id = 'visual-review-capture'; style.textContent = '.site-header{position:absolute!important}.skip-link{display:none!important}'; document.head.append(style); })()` })
  const { contentSize } = await send('Page.getLayoutMetrics')
  const documentHeight = Math.ceil(contentSize.height)
  const maximumScroll = Math.max(0, documentHeight - viewportHeight)
  const positions = []
  for (let y = 0; y < maximumScroll; y += viewportHeight) positions.push(y)
  if (positions.at(-1) !== maximumScroll) positions.push(maximumScroll)
  const tileDirectory = `${path}.tiles`
  rmSync(tileDirectory, { recursive: true, force: true })
  mkdirSync(tileDirectory, { recursive: true })
  for (const y of positions) {
    await send('Runtime.evaluate', { expression: `window.scrollTo({ top:${y}, left:0, behavior:'instant' })` })
    await new Promise((resolveWait) => setTimeout(resolveWait, 80))
    await capture(resolve(tileDirectory, `${String(y).padStart(8, '0')}.png`))
  }
  execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', resolve('scripts', 'stitch-screenshots.ps1'), '-Tiles', tileDirectory, '-Output', path, '-Width', String(viewportWidth), '-Height', String(documentHeight)])
  rmSync(tileDirectory, { recursive: true, force: true })
}

await send('Page.enable')
await send('Runtime.enable')
await send('Network.enable')
await send('Network.setCacheDisabled', { cacheDisabled: true })

for (const [name, route] of routes) {
  await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 1, mobile: true })
  await navigate(route)
  const mobileDirectory = resolve(outputRoot, 'mobile-393x852')
  mkdirSync(mobileDirectory, { recursive: true })
  await captureFullPage(resolve(mobileDirectory, `${name}.png`), 393, 852)

  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await navigate(route)
  const desktopDirectory = resolve(outputRoot, 'desktop-1440x900')
  mkdirSync(desktopDirectory, { recursive: true })
  await capture(resolve(desktopDirectory, `${name}.png`))
}

socket.close()
console.log(`Captured ${routes.length} full mobile pages and ${routes.length} desktop review frames in ${outputRoot}`)
