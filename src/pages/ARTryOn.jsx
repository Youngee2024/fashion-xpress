import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icons'
import { SafeImage } from '../components/SafeImage'
import { products } from '../data/products'

export function ARTryOn() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [active, setActive] = useState(false)
  const [starting, setStarting] = useState(false)
  const [selected, setSelected] = useState(products[2])
  const [message, setMessage] = useState({ text: '', error: false })

  useEffect(() => {
    if (active && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current
  }, [active])

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), [])

  async function startCamera() {
    setStarting(true)
    setMessage({ text: 'Requesting camera permission…', error: false })
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera API unavailable')
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      streamRef.current = stream
      setActive(true)
      setMessage({ text: 'Camera connected. This preview does not apply a garment or capture images.', error: false })
    } catch {
      setMessage({ text: 'Camera access was unavailable. Check browser permissions and try again.', error: true })
    } finally {
      setStarting(false)
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
    setMessage({ text: 'Camera session ended.', error: false })
  }

  return <>
    <section className="ar-heading page-shell"><span className="eyebrow">Experimental atelier · Prototype</span><h1>Your room.<br/><em>Your runway.</em></h1><p>Choose a look and test your camera framing. Garment tracking and photo capture are not available in this prototype.</p></section>
    <section className="page-shell ar-layout"><div className={`camera-stage ${active ? 'is-live' : ''}`}>{active ? <video ref={videoRef} autoPlay playsInline muted/> : <SafeImage className="camera-poster" src="/images/camera.jpg" alt="Camera fitting-room preview"/>}<div className="camera-shade"/><div className="camera-chrome"><span className={active ? 'live' : ''}><i/>{active ? 'Live camera preview' : 'Camera ready'}</span><span>Front camera · Mirrored</span></div><div className="frame-guide" aria-hidden="true"><i/><i/><i/><i/></div>{!active && <div className="camera-empty"><span>AR</span><h2>Camera preview.</h2><p>Stand in a well-lit space with your upper body visible inside the guide.</p><button className="button" onClick={startCamera} disabled={starting} aria-busy={starting}><Icon name="camera" size={17}/>{starting ? 'Requesting access…' : 'Activate camera'}</button></div>}{active && <><div className="ar-overlay"><SafeImage src={selected.image} alt=""/><span><small>Reference look</small>{selected.name}</span></div><div className="camera-controls"><button className="capture" disabled aria-label="Photo capture unavailable in prototype" title="Photo capture is not available yet"><Icon name="camera"/></button><button onClick={stopCamera}>End session</button></div></>}</div><div className="outfit-panel"><div><span className="eyebrow">The fitting rail</span><h2>Choose a reference</h2></div><div className="outfit-list" role="group" aria-label="Select a reference look">{products.slice(0, 4).map((product) => <button key={product.id} className={selected.id === product.id ? 'selected' : ''} onClick={() => setSelected(product)} aria-pressed={selected.id === product.id}><SafeImage src={product.image} alt=""/><span><strong>{product.name}</strong><small>{product.rarity}</small></span><i aria-hidden="true">{selected.id === product.id ? '✓' : '→'}</i></button>)}</div>{message.text && <p className={`ar-message ${message.error ? 'error' : ''}`} role={message.error ? 'alert' : 'status'}>{message.text}</p>}<small className="privacy">Your camera feed stays on your device and is never uploaded.</small></div></section>
    <section className="page-shell ar-steps"><div><b>01</b><h3>Choose a reference</h3><p>Pick a visual reference from the collection.</p></div><div><b>02</b><h3>Allow camera</h3><p>Your browser will ask for permission once.</p></div><div><b>03</b><h3>Frame your view</h3><p>Garment overlay and capture remain in development.</p></div></section>
  </>
}
