import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { DEFAULT_OVERLAY, MAX_PHOTO_BYTES, adjustOverlayFromKey, cameraErrorState, composeTryOn, moveOverlay, normalizeOverlay, requestCamera, stopMediaStream, validatePhotoFile } from '../src/data/tryOn.js'

test('photo validation accepts supported local images and rejects unsafe inputs', () => {
  assert.equal(validatePhotoFile({ type: 'image/jpeg', size: 1024 }), '')
  assert.equal(validatePhotoFile({ type: 'image/png', size: MAX_PHOTO_BYTES }), '')
  assert.match(validatePhotoFile({ type: 'image/svg+xml', size: 1024 }), /JPEG, PNG, or WebP/)
  assert.match(validatePhotoFile({ type: 'image/jpeg', size: MAX_PHOTO_BYTES + 1 }), /smaller than 10 MB/)
  assert.match(validatePhotoFile({ type: 'image/jpeg', size: 0 }), /empty or invalid/)
})

test('overlay transforms remain bounded and keyboard-adjustable', () => {
  assert.deepEqual(normalizeOverlay({ x: -100, y: 200, scale: 500, rotation: -80, opacity: 1, visible: false }), { x: 8, y: 92, scale: 180, rotation: -45, opacity: 20, visible: false })
  assert.equal(moveOverlay(DEFAULT_OVERLAY, 10, -5).x, 60)
  assert.equal(adjustOverlayFromKey(DEFAULT_OVERLAY, 'ArrowRight').x, 52)
  assert.equal(adjustOverlayFromKey(DEFAULT_OVERLAY, 'ArrowDown', true).y, 53)
})

test('camera lifecycle requests only video, classifies failures and stops every track', async () => {
  let constraints
  const stream = { getTracks: () => [{ stop() { this.stopped = true } }, { stop() { this.stopped = true } }] }
  const result = await requestCamera({ getUserMedia: async (value) => { constraints = value; return stream } }, 'environment')
  assert.equal(result, stream)
  assert.deepEqual(constraints, { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
  const tracks = stream.getTracks()
  stream.getTracks = () => tracks
  stopMediaStream(stream)
  assert.ok(tracks.every((track) => track.stopped))
  assert.equal(cameraErrorState({ name: 'NotAllowedError' }), 'denied')
  assert.equal(cameraErrorState({ name: 'NotFoundError' }), 'unavailable')
  await assert.rejects(requestCamera(null), /unavailable/)
})

test('canvas composition matches preview aspect and mirrors only the background', async () => {
  const calls = []
  const context = {
    globalAlpha: 1,
    save: () => calls.push(['save']), restore: () => calls.push(['restore']),
    translate: (...args) => calls.push(['translate', ...args]), scale: (...args) => calls.push(['scale', ...args]),
    rotate: (...args) => calls.push(['rotate', ...args]), drawImage: (...args) => calls.push(['drawImage', ...args]),
  }
  const blob = { type: 'image/jpeg' }
  const canvas = { width: 0, height: 0, getContext: () => context, toBlob: (callback) => callback(blob) }
  const result = await composeTryOn({ canvas, source: { naturalWidth: 1200, naturalHeight: 900 }, garment: { naturalWidth: 600, naturalHeight: 900 }, overlay: { ...DEFAULT_OVERLAY, rotation: 10 }, mirrored: true, previewWidth: 393, previewHeight: 524 })
  assert.equal(result, blob)
  assert.equal(canvas.height, 1200)
  assert.equal(canvas.width, 900)
  assert.ok(calls.some((call) => call[0] === 'scale' && call[1] === -1 && call[2] === 1))
  assert.equal(calls.filter((call) => call[0] === 'drawImage').length, 2)
})

test('Phase 7 source has no upload, persistence, tracking, or external processing path', async () => {
  const page = await readFile(new URL('../src/pages/ARTryOn.jsx', import.meta.url), 'utf8')
  const utility = await readFile(new URL('../src/data/tryOn.js', import.meta.url), 'utf8')
  const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')
  const source = `${page}\n${utility}`
  assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|\/api\/|localStorage|sessionStorage|indexedDB|WebSocket|sendBeacon|window\.ethereum/i)
  assert.doesNotMatch(source, /face.?scan|body.?scan|accurate sizing|automatic body tracking is active/i)
  assert.match(source, /Automatic body tracking is not active/)
  assert.match(source, /URL\.revokeObjectURL/)
  assert.match(source, /playsInline/)
  assert.match(css, /prefers-reduced-motion/)
})
