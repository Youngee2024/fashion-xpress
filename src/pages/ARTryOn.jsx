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
  const [message, setMessage] = useState('')
  const [captures, setCaptures] = useState(0)

  useEffect(() => {
    if (active && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [active])

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), [])

  async function startCamera() {
    setStarting(true)
    setMessage('')
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera API unavailable')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      })
      streamRef.current = stream
      setActive(true)
      setMessage('Camera connected')
    } catch {
      setMessage('Camera access was unavailable. Check browser permissions and try again.')
    } finally {
      setStarting(false)
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
    setMessage('Camera session ended')
  }

  return <>
    <section className="ar-heading page-shell"><span className="eyebrow">Experimental atelier</span><h1>Your room.<br/><em>Your runway.</em></h1><p>Select a piece, activate your camera, and explore the collection in your own space.</p></section>
    <section className="page-shell ar-layout">
      <div className={`camera-stage ${active ? 'is-live' : ''}`}>
        {active ? <video ref={videoRef} autoPlay playsInline muted/> : <SafeImage className="camera-poster" src="/images/ar.jpg" alt="AR fitting room preview"/>}
        <div className="camera-shade"/>
        <div className="camera-chrome"><span className={active ? 'live' : ''}><i/>{active ? 'Live view' : 'Camera ready'}</span><span>Front camera · Mirrored</span></div>
        <div className="frame-guide" aria-hidden="true"><i/><i/><i/><i/></div>
        {!active && <div className="camera-empty"><span>AR</span><h2>Step into the frame.</h2><p>Stand in a well-lit space with your upper body visible inside the guide.</p><button className="button" onClick={startCamera} disabled={starting}><Icon name="camera" size={17}/>{starting ? 'Requesting access…' : 'Activate camera'}</button></div>}
        {active && <><div className="ar-overlay"><SafeImage src={selected.image} alt={`${selected.name} preview`}/><span><small>Selected look</small>{selected.name}</span></div><div className="camera-controls"><button className="capture" onClick={() => setCaptures((count) => count + 1)} aria-label="Capture photo"><Icon name="camera"/></button><button onClick={stopCamera}>End session</button></div></>}
      </div>
      <div className="outfit-panel"><div><span className="eyebrow">The fitting rail</span><h2>Choose a look</h2></div><div className="outfit-list">{products.slice(0, 4).map((product) => <button key={product.id} className={selected.id === product.id ? 'selected' : ''} onClick={() => setSelected(product)}><SafeImage src={product.image} alt={product.name}/><span><strong>{product.name}</strong><small>{product.rarity}</small></span><i>{selected.id === product.id ? '✓' : '→'}</i></button>)}</div>{message && <p className="ar-message" role="status">{message}</p>}{captures > 0 && <p className="ar-message">{captures} {captures === 1 ? 'moment' : 'moments'} captured this session.</p>}<small className="privacy">Your camera feed stays on your device and is never uploaded.</small></div>
    </section>
    <section className="page-shell ar-steps"><div><b>01</b><h3>Choose a piece</h3><p>Pick from an edit of AR-ready garments.</p></div><div><b>02</b><h3>Allow camera</h3><p>Your browser will ask for permission once.</p></div><div><b>03</b><h3>Make it yours</h3><p>Move, explore, and capture the moment.</p></div></section>
  </>
}
