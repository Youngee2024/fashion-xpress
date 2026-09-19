import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { SafeImage } from '../components/SafeImage'
import { DEFAULT_OVERLAY, adjustOverlayFromKey, cameraErrorState, composeTryOn, moveOverlay, normalizeOverlay, requestCamera, stopMediaStream, validatePhotoFile } from '../data/tryOn'
import { productById, products } from '../data/products'

const stateMessages = {
  idle: 'Choose the camera or a local photo. Nothing starts automatically.',
  requesting: 'Waiting for browser camera permission…',
  active: 'Camera active. The red indicator remains visible while the stream is running.',
  denied: 'Camera permission was denied. Retry after updating browser permissions, or choose a local photo.',
  unavailable: 'No suitable camera is available. Choose a local photo instead.',
  unsupported: 'This browser does not provide the required camera API. Choose a local photo instead.',
  error: 'The camera could not start. Check whether another app is using it, then retry or choose a photo.',
}

export function ARTryOn() {
  const [params] = useSearchParams()
  const requestedProduct = params.get('product')
  const initialProduct = productById[requestedProduct] ?? products[0]
  const videoRef = useRef(null)
  const photoRef = useRef(null)
  const garmentRef = useRef(null)
  const canvasRef = useRef(null)
  const stageRef = useRef(null)
  const streamRef = useRef(null)
  const photoUrlRef = useRef('')
  const captureUrlRef = useRef('')
  const requestRef = useRef(0)
  const dragRef = useRef(null)
  const [cameraState, setCameraState] = useState('idle')
  const [sourceKind, setSourceKind] = useState('none')
  const [facingMode, setFacingMode] = useState('user')
  const [canSwitchCamera, setCanSwitchCamera] = useState(false)
  const [selected, setSelected] = useState(initialProduct)
  const [photoUrl, setPhotoUrl] = useState('')
  const [captureUrl, setCaptureUrl] = useState('')
  const [captureSource, setCaptureSource] = useState('none')
  const [overlay, setOverlay] = useState(DEFAULT_OVERLAY)
  const [message, setMessage] = useState(requestedProduct && !productById[requestedProduct] ? 'Unknown garment recovered to the first trusted catalogue piece.' : stateMessages.idle)
  const [busy, setBusy] = useState(false)

  function revokePhoto() {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current)
    photoUrlRef.current = ''
    setPhotoUrl('')
  }

  function revokeCapture() {
    if (captureUrlRef.current) URL.revokeObjectURL(captureUrlRef.current)
    captureUrlRef.current = ''
    setCaptureUrl('')
  }

  function stopCamera(nextState = 'idle') {
    requestRef.current += 1
    stopMediaStream(streamRef.current)
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraState(nextState)
    if (sourceKind === 'camera') setSourceKind('none')
  }

  useEffect(() => {
    if (cameraState === 'active' && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current
  }, [cameraState])

  useEffect(() => () => {
    requestRef.current += 1
    stopMediaStream(streamRef.current)
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current)
    if (captureUrlRef.current) URL.revokeObjectURL(captureUrlRef.current)
  }, [])

  async function startCamera(nextFacing = facingMode) {
    revokeCapture()
    revokePhoto()
    stopCamera('requesting')
    setSourceKind('none')
    setMessage(stateMessages.requesting)
    const requestId = ++requestRef.current
    try {
      const stream = await requestCamera(navigator.mediaDevices, nextFacing)
      if (requestId !== requestRef.current) { stopMediaStream(stream); return }
      streamRef.current = stream
      setFacingMode(nextFacing)
      setSourceKind('camera')
      setCameraState('active')
      setMessage(stateMessages.active)
      try {
        const devices = await navigator.mediaDevices.enumerateDevices?.()
        setCanSwitchCamera(Array.isArray(devices) && devices.filter((device) => device.kind === 'videoinput').length > 1)
      } catch { setCanSwitchCamera(false) }
    } catch (error) {
      if (requestId !== requestRef.current) return
      const state = error?.name === 'UnsupportedError' ? 'unsupported' : cameraErrorState(error)
      setCameraState(state)
      setSourceKind('none')
      setMessage(stateMessages[state])
    }
  }

  function choosePhoto(event) {
    const file = event.target.files?.[0]
    const error = validatePhotoFile(file)
    event.target.value = ''
    if (error) { setMessage(error); return }
    stopCamera('idle')
    revokeCapture()
    revokePhoto()
    const url = URL.createObjectURL(file)
    photoUrlRef.current = url
    setPhotoUrl(url)
    setSourceKind('photo')
    setMessage('Local photo ready. It remains in browser memory only and is not uploaded.')
  }

  function updateOverlay(field, value) {
    setOverlay((current) => normalizeOverlay({ ...current, [field]: Number(value) }))
  }

  function beginDrag(event) {
    if (!selected || !overlay.visible) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, overlay }
  }

  function dragOverlay(event) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId || !stageRef.current) return
    const bounds = stageRef.current.getBoundingClientRect()
    const start = dragRef.current
    setOverlay(moveOverlay(start.overlay, (event.clientX - start.x) / bounds.width * 100, (event.clientY - start.y) / bounds.height * 100))
  }

  function endDrag(event) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
  }

  function handleOverlayKey(event) {
    if (!event.key.startsWith('Arrow')) return
    event.preventDefault()
    setOverlay((current) => adjustOverlayFromKey(current, event.key, event.shiftKey))
    setMessage(`Garment position adjusted ${event.key.replace('Arrow', '').toLowerCase()}.`)
  }

  async function captureComposition() {
    const source = sourceKind === 'camera' ? videoRef.current : photoRef.current
    if (!selected || !source) { setMessage('Choose a garment and camera or photo source before capturing.'); return }
    setBusy(true)
    revokeCapture()
    try {
      const stageBounds = stageRef.current?.getBoundingClientRect()
      const blob = await composeTryOn({ canvas: canvasRef.current, source, garment: garmentRef.current, overlay, mirrored: sourceKind === 'camera' && facingMode === 'user', previewWidth: stageBounds?.width, previewHeight: stageBounds?.height })
      const url = URL.createObjectURL(blob)
      captureUrlRef.current = url
      setCaptureUrl(url)
      setCaptureSource(sourceKind)
      if (sourceKind === 'camera') stopCamera('idle')
      setSourceKind('capture')
      setMessage('Local composition captured. Nothing was uploaded or persisted.')
    } catch (error) {
      setMessage(error.message || 'The local composition could not be captured.')
    } finally { setBusy(false) }
  }

  function retake() {
    revokeCapture()
    if (captureSource === 'camera') startCamera(facingMode)
    else if (photoUrlRef.current) { setSourceKind('photo'); setMessage('Local photo restored for another composition.') }
    else { setSourceKind('none'); setMessage(stateMessages.idle) }
  }

  function resetExperience() {
    stopCamera('idle')
    revokePhoto()
    revokeCapture()
    setSourceKind('none')
    setCaptureSource('none')
    setSelected(products[0])
    setOverlay(DEFAULT_OVERLAY)
    setCanSwitchCamera(false)
    setFacingMode('user')
    setMessage('Virtual Try-On Prototype reset. No local image remains in memory.')
  }

  const hasSource = sourceKind === 'camera' || sourceKind === 'photo'
  const cameraProblem = ['denied', 'unavailable', 'unsupported', 'error'].includes(cameraState)
  const overlayStyle = { left: `${overlay.x}%`, top: `${overlay.y}%`, opacity: overlay.opacity / 100, transform: `translate(-50%, -50%) rotate(${overlay.rotation}deg) scale(${overlay.scale / 100})` }

  return <section className="page-shell tryon-page"><header className="tryon-heading"><span className="eyebrow">Virtual Try-On Prototype</span><h1>Style it locally.</h1><p>Position a garment manually over a camera preview or local photo. Automatic body tracking is not active, and this creative preview cannot assess fit or sizing.</p></header><p className="tryon-status" role={cameraProblem ? 'alert' : 'status'} aria-live="polite">{message}</p>
    <div className="tryon-layout"><div><div ref={stageRef} className={`tryon-stage ${cameraState === 'active' ? 'is-live' : ''}`}>{sourceKind === 'camera' && <video ref={videoRef} autoPlay playsInline muted className={facingMode === 'user' ? 'mirrored' : ''}/>} {sourceKind === 'photo' && <img ref={photoRef} className="tryon-source" src={photoUrl} alt="Selected local preview"/>}{sourceKind === 'capture' && <img className="tryon-source" src={captureUrl} alt="Captured local garment composition"/>}{sourceKind === 'none' && <SafeImage priority className="tryon-source tryon-placeholder" src="/images/camera.jpg" alt="Virtual try-on prototype preview" width="1200" height="900"/>}
        {hasSource && selected && overlay.visible && <div className="tryon-garment" style={overlayStyle} role="application" tabIndex="0" aria-label={`${selected.name} manual overlay. Drag, or use arrow keys to reposition. Shift plus arrow moves farther.`} onPointerDown={beginDrag} onPointerMove={dragOverlay} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={handleOverlayKey}><img ref={garmentRef} src={selected.image} alt="" width="360" height="480" draggable="false"/></div>}
        <div className="camera-chrome"><span className={cameraState === 'active' ? 'live' : ''}><i/>{cameraState === 'active' ? 'Camera active' : sourceKind === 'photo' ? 'Local photo' : sourceKind === 'capture' ? 'Local capture' : 'Preview idle'}</span><span>{cameraState === 'active' && facingMode === 'user' ? 'Front · Mirrored' : 'On-device only'}</span></div>
        {sourceKind === 'none' && <div className="tryon-source-actions"><h2>Choose your starting point.</h2><p>Camera permission is requested only after activation. Photos remain in memory and are never uploaded.</p><div><button className="button" type="button" onClick={() => startCamera('user')} disabled={cameraState === 'requesting'} aria-busy={cameraState === 'requesting'}><Icon name="camera" size={17}/>{cameraState === 'requesting' ? 'Requesting permission…' : cameraProblem ? 'Retry camera' : 'Use camera'}</button><label className="button ghost">Choose local photo<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto}/></label></div></div>}
        {cameraState === 'active' && <div className="tryon-camera-actions"><button type="button" onClick={() => stopCamera('idle')}>Stop camera</button>{canSwitchCamera && <button type="button" onClick={() => startCamera(facingMode === 'user' ? 'environment' : 'user')}>Use {facingMode === 'user' ? 'rear' : 'front'} camera</button>}</div>}
        {hasSource && <button className="tryon-capture" type="button" onClick={captureComposition} disabled={busy || !selected} aria-label="Capture combined image locally"><Icon name="camera" size={22}/><span>{busy ? 'Capturing…' : 'Capture locally'}</span></button>}
        {sourceKind === 'capture' && <div className="tryon-result-actions"><button className="button" type="button" onClick={retake}>Retake</button><a className="button ghost" href={captureUrl} download={`fashionxpress-${selected?.id ?? 'style'}-preview.jpg`}>Download locally</a></div>}
      </div><canvas ref={canvasRef} hidden/><p className="tryon-privacy">No image leaves this browser. No biometric data, face or body measurement, background recording, upload, or online storage occurs.</p></div>
      <aside className="tryon-panel"><div><span className="eyebrow">01 / Garment</span><h2>Choose a piece</h2><div className="tryon-garments" role="group" aria-label="Choose a garment overlay">{products.map((product) => <button type="button" key={product.id} aria-pressed={selected?.id === product.id} className={selected?.id === product.id ? 'selected' : ''} onClick={() => { setSelected(product); setMessage(`${product.name} selected for manual positioning.`) }}><SafeImage src={product.image} alt="" width="92" height="116"/><span>{product.name}</span></button>)}</div></div><div className="tryon-controls"><span className="eyebrow">02 / Manual styling overlay</span><h2>Adjust the layer</h2><label htmlFor="tryon-size">Size <output htmlFor="tryon-size">{overlay.scale}%</output><input id="tryon-size" type="range" min="45" max="180" value={overlay.scale} onChange={(event) => updateOverlay('scale', event.target.value)}/></label><label htmlFor="tryon-rotation">Rotation <output htmlFor="tryon-rotation">{overlay.rotation}°</output><input id="tryon-rotation" type="range" min="-45" max="45" value={overlay.rotation} onChange={(event) => updateOverlay('rotation', event.target.value)}/></label><label htmlFor="tryon-opacity">Opacity <output htmlFor="tryon-opacity">{overlay.opacity}%</output><input id="tryon-opacity" type="range" min="20" max="100" value={overlay.opacity} onChange={(event) => updateOverlay('opacity', event.target.value)}/></label><div className="tryon-control-buttons"><button type="button" onClick={() => setOverlay((current) => ({ ...current, x: 50, y: 48 }))}>Center</button><button type="button" onClick={() => setOverlay(DEFAULT_OVERLAY)}>Reset position</button><button type="button" aria-pressed={overlay.visible} onClick={() => setOverlay((current) => ({ ...current, visible: !current.visible }))}>{overlay.visible ? 'Hide layer' : 'Show layer'}</button><button type="button" onClick={() => setSelected(null)}>Clear garment</button></div></div><div className="tryon-reset"><button className="button ghost" type="button" onClick={resetExperience}>Reset experience</button>{selected && <Link className="text-link" to={`/collections/${selected.id}`}>View product details</Link>}</div></aside></div>
  </section>
}
