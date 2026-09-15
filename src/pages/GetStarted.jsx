import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icons'
import { DemoComplete, FieldError } from '../components/PrototypeUI'
import { hasErrors, validateCreator } from '../data/formValidation'

const initialForm = { name: '', email: '', portfolio: '', specialty: '', vision: '' }

export function GetStarted() {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [stage, setStage] = useState('editing')
  const timerRef = useRef()
  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  function update(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    if (errors[name]) setErrors((current) => ({ ...current, [name]: '' }))
  }

  function submit(event) {
    event.preventDefault()
    const nextErrors = validateCreator(form)
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) {
      setStage('editing')
      document.getElementById(`creator-${Object.keys(nextErrors).find((key) => nextErrors[key])}`)?.focus()
      return
    }
    setStage('reviewing')
    timerRef.current = window.setTimeout(() => setStage('complete'), 450)
  }

  return <section className="form-page page-shell creator-form"><div className="form-intro"><span className="eyebrow">Creator atelier concept</span><h1>Bring what<br/><em>doesn’t exist yet.</em></h1><p>Explore how a future portfolio review could feel for independent digital-fashion creators.</p><ul><li><Icon name="check"/> Marketplace experience concept</li><li><Icon name="check"/> AR and sampling vision</li><li><Icon name="check"/> Transparent-license approach</li></ul></div>{stage === 'complete' ? <DemoComplete title="Application journey demonstrated." onReset={() => { setForm(initialForm); setErrors({}); setStage('editing') }}>No portfolio or personal information was transmitted. The creator intake is not currently open.</DemoComplete> : <form className="editorial-form" noValidate onSubmit={submit} aria-busy={stage === 'reviewing'}><div className="form-heading"><span className="eyebrow">Interactive application demo</span><h2>Shape your introduction.</h2></div>{hasErrors(errors) && <div className="error-summary" role="alert"><strong>Review the highlighted fields.</strong><span>Your values have been preserved.</span></div>}<div className="field-pair"><label>Name<input id="creator-name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'creator-name-error' : undefined} name="name" value={form.name} onChange={update} autoComplete="name"/></label><FieldError id="creator-name-error">{errors.name}</FieldError><label>Email<input id="creator-email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'creator-email-error' : undefined} type="email" name="email" value={form.email} onChange={update} autoComplete="email"/></label><FieldError id="creator-email-error">{errors.email}</FieldError></div><label>Portfolio URL<input id="creator-portfolio" aria-invalid={Boolean(errors.portfolio)} aria-describedby={errors.portfolio ? 'creator-portfolio-error' : undefined} type="url" name="portfolio" value={form.portfolio} onChange={update} placeholder="https://"/></label><FieldError id="creator-portfolio-error">{errors.portfolio}</FieldError><label>Design practice<select id="creator-specialty" aria-invalid={Boolean(errors.specialty)} aria-describedby={errors.specialty ? 'creator-specialty-error' : undefined} name="specialty" value={form.specialty} onChange={update}><option value="">Select your discipline</option><option>3D streetwear</option><option>Virtual couture</option><option>Digital accessories</option><option>Material artist</option></select></label><FieldError id="creator-specialty-error">{errors.specialty}</FieldError><label>Your vision<textarea id="creator-vision" aria-invalid={Boolean(errors.vision)} aria-describedby={errors.vision ? 'creator-vision-error creator-privacy' : 'creator-privacy'} rows="4" name="vision" value={form.vision} onChange={update} placeholder="What world are you trying to build?"/></label><FieldError id="creator-vision-error">{errors.vision}</FieldError><p id="creator-privacy" className="prototype-note">Portfolio prototype—nothing is sent or stored, including personal details.</p><button className="button" type="submit" disabled={stage === 'reviewing'}>{stage === 'reviewing' ? 'Checking demo locally…' : <>Complete application demo <Icon name="arrow" size={16}/></>}</button></form>}</section>
}
