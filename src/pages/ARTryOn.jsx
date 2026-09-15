import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icons'
import { PrototypeNotice } from '../components/PrototypeUI'
import { SafeImage } from '../components/SafeImage'
import { products } from '../data/products'

const stateMessages = {
  idle: 'Camera access begins only when you choose to activate it.',
  requesting: 'Waiting for browser camera permission…',
  active: 'Camera active. Reference garments are not fitted or composited.',
  captured: 'Plain camera frame captured locally. Nothing was uploaded.',
  denied: 'Camera permission was denied. Update browser permissions, then retry.',
  unsupported: 'This browser does not provide the required camera API.',
  error: 'The camera could not start. Check that another app is not using it, then retry.',
}

export function ARTryOn() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraState, setCameraState] = useState('idle')
  const [selected, setSelected] = useState(products[2])
  const [capture, setCapture] = useState('')

  useEffect(() => {
    if (cameraState === 'active' && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current
  }, [cameraState])

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), [])

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unsupported')
      return
    }
    setCameraState('requesting')
    setCapture('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      streamRef.current = stream
      setCameraState('active')
    } catch (error) {
      setCameraState(error?.name === 'NotAllowedError' ? 'denied' : 'error')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraState('idle')
  }

  function captureFrame() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video?.videoWidth || !canvas) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setCameraState('error')
      return
    }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setCameraState('error')
      return
    }
    context.translate(canvas.width, 0)
    context.scale(-1, 1)
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    setCapture(canvas.toDataURL('image/jpeg', .9))
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraState('captured')
  }

  const canRetry = ['denied', 'error'].includes(cameraState)
  const active = cameraState === 'active'

  return <>
    <section className="ar-heading page-shell"><span className="eyebrow">Camera preview prototype</span><h1>AR Try-on<br/><em>concept.</em></h1><p>Test camera framing, choose a visual reference, and capture a plain local frame. No garment tracking or fitting occurs.</p><a className="button ar-jump" href="#camera-concept">Open camera concept <Icon name="camera" size={17}/></a></section>
    <section id="camera-concept" className="page-shell ar-layout"><div className={`camera-stage ${active ? 'is-live' : ''}`}>{active ? <video ref={videoRef} autoPlay playsInline muted/> : capture ? <img className="camera-poster" src={capture} alt="Locally captured camera frame"/> : <SafeImage priority className="camera-poster" src="/images/camera.jpg" alt="Camera preview concept" width="1200" height="900"/>}<div className="camera-shade"/><div className="camera-chrome"><span className={active ? 'live' : ''}><i/>{active ? 'Live plain camera' : capture ? 'Local capture' : 'Camera idle'}</span><span>Front camera · Mirrored</span></div><div className="frame-guide" aria-hidden="true"><i/><i/><i/><i/></div>{!active && !capture && <div className="camera-empty"><span>AR</span><h2>Enter the frame.</h2><p>This activates a plain camera preview only. Your selected look remains a separate reference.</p><button className="button" onClick={startCamera} disabled={cameraState === 'requesting'} aria-busy={cameraState === 'requesting'}><Icon name="camera" size={17}/>{cameraState === 'requesting' ? 'Requesting permission…' : canRetry ? 'Retry camera' : 'Activate camera'}</button></div>}{active && <><div className="ar-overlay"><SafeImage src={selected.image} alt="" width="112" height="140"/><span><small>Separate reference</small>{selected.name}</span></div><div className="camera-controls"><button className="capture" onClick={captureFrame} aria-label="Capture plain camera frame locally"><Icon name="camera"/></button><button onClick={stopCamera}>End preview</button></div></>}{capture && <div className="camera-controls capture-review"><button className="button" onClick={() => { setCapture(''); setCameraState('idle') }}>Retake</button><a className="button ghost" href={capture} download="fashionxpress-camera-preview.jpg">Download locally</a></div>}<canvas ref={canvasRef} hidden/></div><div className="outfit-panel"><div><span className="eyebrow">Visual reference rail</span><h2>Choose a reference</h2></div><PrototypeNotice compact>The selected piece is displayed beside the camera only. It is never placed on your body.</PrototypeNotice><div className="outfit-list" role="group" aria-label="Select a visual reference look">{products.slice(0, 4).map((product) => <button key={product.id} className={selected.id === product.id ? 'selected' : ''} onClick={() => setSelected(product)} aria-pressed={selected.id === product.id}><SafeImage src={product.image} alt="" width="108" height="132"/><span><strong>{product.name}</strong><small>{product.rarity}</small></span><i aria-hidden="true">{selected.id === product.id ? '✓' : '→'}</i></button>)}</div><p className={`ar-message ${['denied', 'unsupported', 'error'].includes(cameraState) ? 'error' : ''}`} role={['denied', 'unsupported', 'error'].includes(cameraState) ? 'alert' : 'status'} aria-live="polite">{stateMessages[cameraState]}</p><small className="privacy">Camera frames stay on your device. A download occurs only when you choose it.</small></div></section>
    <section className="page-shell ar-production"><span className="eyebrow">Production vision</span><h2>What real AR would add.</h2><div><article><b>01</b><h3>Body-aware placement</h3><p>Consent-led pose estimation and garment anchoring rather than a decorative overlay.</p></article><article><b>02</b><h3>Material response</h3><p>Lighting and movement behavior validated against each garment’s authored design.</p></article><article><b>03</b><h3>Clear processing controls</h3><p>Transparent on-device or server-processing choices, retention rules, and deletion controls.</p></article></div></section>
  </>
}
