export const MAX_PHOTO_BYTES = 10 * 1024 * 1024
export const SUPPORTED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
export const DEFAULT_OVERLAY = Object.freeze({ x: 50, y: 48, scale: 100, rotation: 0, opacity: 85, visible: true })

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value))

export function validatePhotoFile(file) {
  if (!file) return 'Choose a photo to continue.'
  if (!SUPPORTED_PHOTO_TYPES.has(file.type)) return 'Choose a JPEG, PNG, or WebP image.'
  if (!Number.isSafeInteger(file.size) || file.size <= 0) return 'The selected image is empty or invalid.'
  if (file.size > MAX_PHOTO_BYTES) return 'Choose an image smaller than 10 MB.'
  return ''
}

export function normalizeOverlay(value = {}) {
  return {
    x: clamp(Number.isFinite(value.x) ? value.x : DEFAULT_OVERLAY.x, 8, 92),
    y: clamp(Number.isFinite(value.y) ? value.y : DEFAULT_OVERLAY.y, 8, 92),
    scale: clamp(Number.isFinite(value.scale) ? value.scale : DEFAULT_OVERLAY.scale, 45, 180),
    rotation: clamp(Number.isFinite(value.rotation) ? value.rotation : DEFAULT_OVERLAY.rotation, -45, 45),
    opacity: clamp(Number.isFinite(value.opacity) ? value.opacity : DEFAULT_OVERLAY.opacity, 20, 100),
    visible: typeof value.visible === 'boolean' ? value.visible : DEFAULT_OVERLAY.visible,
  }
}

export function moveOverlay(value, deltaX, deltaY) {
  const current = normalizeOverlay(value)
  return normalizeOverlay({ ...current, x: current.x + deltaX, y: current.y + deltaY })
}

export function adjustOverlayFromKey(value, key, largeStep = false) {
  const step = largeStep ? 5 : 2
  if (key === 'ArrowLeft') return moveOverlay(value, -step, 0)
  if (key === 'ArrowRight') return moveOverlay(value, step, 0)
  if (key === 'ArrowUp') return moveOverlay(value, 0, -step)
  if (key === 'ArrowDown') return moveOverlay(value, 0, step)
  return normalizeOverlay(value)
}

export function cameraErrorState(error) {
  if (['NotAllowedError', 'PermissionDeniedError'].includes(error?.name)) return 'denied'
  if (['NotFoundError', 'DevicesNotFoundError', 'OverconstrainedError'].includes(error?.name)) return 'unavailable'
  return 'error'
}

export async function requestCamera(mediaDevices, facingMode = 'user') {
  if (!mediaDevices?.getUserMedia) throw Object.assign(new Error('Camera API unavailable.'), { name: 'UnsupportedError' })
  return mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
}

export function stopMediaStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop())
}

function drawCover(context, source, width, height, mirrored) {
  const sourceWidth = source.videoWidth || source.naturalWidth || source.width
  const sourceHeight = source.videoHeight || source.naturalHeight || source.height
  if (!sourceWidth || !sourceHeight) throw new Error('The local image is not ready.')
  const scale = Math.max(width / sourceWidth, height / sourceHeight)
  const drawWidth = sourceWidth * scale
  const drawHeight = sourceHeight * scale
  const x = (width - drawWidth) / 2
  const y = (height - drawHeight) / 2
  context.save()
  if (mirrored) { context.translate(width, 0); context.scale(-1, 1); context.drawImage(source, x, y, drawWidth, drawHeight) }
  else context.drawImage(source, x, y, drawWidth, drawHeight)
  context.restore()
}

export function composeTryOn({ canvas, source, garment, overlay, mirrored = false, previewWidth, previewHeight, maxDimension = 1600 }) {
  const sourceWidth = source?.videoWidth || source?.naturalWidth || source?.width
  const sourceHeight = source?.videoHeight || source?.naturalHeight || source?.height
  if (!canvas?.getContext || !sourceWidth || !sourceHeight || !garment?.naturalWidth || !garment?.naturalHeight) return Promise.reject(new Error('The local preview is not ready to capture.'))
  const previewAspect = previewWidth > 0 && previewHeight > 0 ? previewWidth / previewHeight : sourceWidth / sourceHeight
  const longEdge = Math.min(maxDimension, Math.max(sourceWidth, sourceHeight))
  canvas.width = Math.max(1, Math.round(previewAspect >= 1 ? longEdge : longEdge * previewAspect))
  canvas.height = Math.max(1, Math.round(previewAspect >= 1 ? longEdge / previewAspect : longEdge))
  const context = canvas.getContext('2d')
  if (!context) return Promise.reject(new Error('Canvas export is unavailable.'))
  const safeOverlay = normalizeOverlay(overlay)
  drawCover(context, source, canvas.width, canvas.height, mirrored)
  if (safeOverlay.visible) {
    const width = canvas.width * .38 * (safeOverlay.scale / 100)
    const height = width * (garment.naturalHeight / garment.naturalWidth)
    context.save()
    context.globalAlpha = safeOverlay.opacity / 100
    context.translate(canvas.width * safeOverlay.x / 100, canvas.height * safeOverlay.y / 100)
    context.rotate(safeOverlay.rotation * Math.PI / 180)
    context.drawImage(garment, -width / 2, -height / 2, width, height)
    context.restore()
  }
  if (typeof canvas.toBlob !== 'function') return Promise.reject(new Error('Canvas export is unsupported in this browser.'))
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The local composition could not be exported.')), 'image/jpeg', .9))
}
