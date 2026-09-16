import { useRef, useState } from 'react'
import { Icon } from '../components/Icons'
import { FieldError } from '../components/PrototypeUI'
import { ConsentField, Honeypot, ServiceStatus, SubmissionSuccess } from '../components/WorkflowUI'
import { hasErrors, validateCreator } from '../data/formValidation'
import { submitWorkflow } from '../data/workflowApi'
import { useWorkflowAvailability } from '../hooks/useWorkflowAvailability'

const initialForm = { name: '', email: '', location: '', portfolio: '', specialty: '', vision: '', consent: false, website: '' }

export function GetStarted() {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [stage, setStage] = useState('editing')
  const [result, setResult] = useState(null)
  const startedAt = useRef(Date.now())
  const submitting = useRef(false)
  const availability = useWorkflowAvailability()

  function update(event) {
    const { name, value, checked, type } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) setErrors((current) => ({ ...current, [name]: '' }))
  }

  async function submit(event) {
    event.preventDefault()
    if (submitting.current || availability !== 'available') return
    const nextErrors = validateCreator(form)
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) {
      document.getElementById(`creator-${Object.keys(nextErrors).find((key) => nextErrors[key])}`)?.focus()
      return
    }
    submitting.current = true
    setStage('submitting')
    setResult(null)
    const response = await submitWorkflow('/api/creator-applications', { ...form, startedAt: startedAt.current })
    submitting.current = false
    if (response.ok) {
      setForm(initialForm)
      setErrors({})
      setResult(response)
      setStage('complete')
      return
    }
    if (response.fields) setErrors(response.fields)
    setResult(response)
    setStage('error')
  }

  function reset() {
    startedAt.current = Date.now()
    setForm(initialForm)
    setErrors({})
    setResult(null)
    setStage('editing')
  }

  return <section className="form-page page-shell creator-form"><div className="form-intro"><span className="eyebrow">Creator atelier</span><h1>Bring what<br/><em>doesn’t exist yet.</em></h1><p>Introduce your independent digital-fashion practice for future review.</p><ul><li><Icon name="check"/> Marketplace experience concept</li><li><Icon name="check"/> AR and sampling vision</li><li><Icon name="check"/> Transparent-license approach</li></ul></div>{stage === 'complete' ? <SubmissionSuccess title="Your application was received." reference={result.reference} notification={result.notification} onReset={reset}>Submission does not guarantee acceptance or a particular response time.</SubmissionSuccess> : <form className="editorial-form" noValidate onSubmit={submit} aria-busy={stage === 'submitting'}><div className="form-heading"><span className="eyebrow">Creator application</span><h2>Shape your introduction.</h2></div><ServiceStatus status={availability} noun="creator application"/>{(hasErrors(errors) || stage === 'error') && <div className="error-summary" role="alert"><strong>{result?.message ?? 'Review the highlighted fields.'}</strong><span>Your values have been preserved. {result?.recoverable && 'You can retry safely.'}</span></div>}<fieldset disabled={availability !== 'available' || stage === 'submitting'}><div className="field-pair"><div><label>Name<input id="creator-name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'creator-name-error' : undefined} name="name" maxLength="100" value={form.name} onChange={update} autoComplete="name"/></label><FieldError id="creator-name-error">{errors.name}</FieldError></div><div><label>Email<input id="creator-email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'creator-email-error' : undefined} type="email" name="email" maxLength="254" value={form.email} onChange={update} autoComplete="email"/></label><FieldError id="creator-email-error">{errors.email}</FieldError></div></div><label>Location<input id="creator-location" aria-invalid={Boolean(errors.location)} aria-describedby={errors.location ? 'creator-location-error' : undefined} name="location" maxLength="120" value={form.location} onChange={update} autoComplete="address-level2" placeholder="City, country"/></label><FieldError id="creator-location-error">{errors.location}</FieldError><label>Portfolio URL<input id="creator-portfolio" aria-invalid={Boolean(errors.portfolio)} aria-describedby={errors.portfolio ? 'creator-portfolio-error' : undefined} type="url" name="portfolio" maxLength="500" value={form.portfolio} onChange={update} placeholder="https://"/></label><FieldError id="creator-portfolio-error">{errors.portfolio}</FieldError><label>Design practice<select id="creator-specialty" aria-invalid={Boolean(errors.specialty)} aria-describedby={errors.specialty ? 'creator-specialty-error' : undefined} name="specialty" value={form.specialty} onChange={update}><option value="">Select your discipline</option><option>3D streetwear</option><option>Virtual couture</option><option>Digital accessories</option><option>Material artist</option></select></label><FieldError id="creator-specialty-error">{errors.specialty}</FieldError><label>Your vision<textarea id="creator-vision" aria-invalid={Boolean(errors.vision)} aria-describedby={errors.vision ? 'creator-vision-error creator-privacy' : 'creator-privacy'} rows="4" name="vision" minLength="30" maxLength="3000" value={form.vision} onChange={update} placeholder="What world are you trying to build?"/></label><FieldError id="creator-vision-error">{errors.vision}</FieldError><ConsentField id="creator-consent" checked={form.consent} onChange={update} error={errors.consent}>I agree that FashionXpress may store and review this application and contact me about it.</ConsentField><Honeypot prefix="creator" value={form.website} onChange={update}/><p id="creator-privacy" className="prototype-note">No file upload is used. Application data is stored through Supabase and notification email is processed by Resend.</p><button className="button" type="submit" disabled={availability !== 'available' || stage === 'submitting'}>{stage === 'submitting' ? 'Submitting securely…' : <>Submit application <Icon name="arrow" size={16}/></>}</button></fieldset></form>}</section>
}
