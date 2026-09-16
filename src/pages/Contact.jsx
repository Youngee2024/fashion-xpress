import { useRef, useState } from 'react'
import { Icon } from '../components/Icons'
import { FieldError } from '../components/PrototypeUI'
import { ConsentField, Honeypot, PortfolioDemoIndicator, ServiceStatus, SubmissionSuccess } from '../components/WorkflowUI'
import { IS_DEMO_MODE } from '../data/appMode'
import { hasErrors, validateContact } from '../data/formValidation'
import { runWorkflow } from '../data/workflowApi'
import { useWorkflowAvailability } from '../hooks/useWorkflowAvailability'

const initialForm = { name: '', email: '', topic: '', message: '', consent: false, website: '' }
const demoMessage = 'Demo complete—your message was not sent.'

export function Contact() {
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
    const nextErrors = validateContact(form)
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) {
      document.getElementById(`contact-${Object.keys(nextErrors).find((key) => nextErrors[key])}`)?.focus()
      return
    }
    submitting.current = true
    setStage('submitting')
    setResult(null)
    const response = await runWorkflow({ endpoint: '/api/contact', payload: { ...form, startedAt: startedAt.current }, demoMessage })
    submitting.current = false
    if (response.ok) {
      if (!response.demo) setForm(initialForm)
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

  return <section className="form-page page-shell">
    <div className="form-intro"><span className="eyebrow">Contact</span><h1>Message<br/><em>the future.</em></h1><p>{IS_DEMO_MODE ? 'Explore the contact flow locally or use the direct email links below.' : 'Send a secure enquiry or use the direct email links below.'}</p><div className="contact-list"><div><span>General</span><a href="mailto:hello@fashionxpress.com">hello@fashionxpress.com</a></div><div><span>Creators</span><a href="mailto:creators@fashionxpress.com">creators@fashionxpress.com</a></div></div></div>
    {stage === 'complete' ? <SubmissionSuccess title={result.demo ? demoMessage : 'Your message is safely in the queue.'} reference={result.reference} notification={result.notification} demo={result.demo} onReset={reset}>{result.demo ? 'Nothing was transmitted, emailed, or saved. Choose Done to clear your entries.' : 'Keep the reference below if you need to follow up.'}</SubmissionSuccess> : <form className="editorial-form" noValidate onSubmit={submit} aria-busy={stage === 'submitting'}>
      <div className="form-heading"><span className="eyebrow">{IS_DEMO_MODE ? 'Contact walkthrough' : 'Secure enquiry'}</span><h2>Compose your message.</h2></div>
      <ServiceStatus status={availability} noun="contact submission"/>
      {(hasErrors(errors) || stage === 'error') && <div className="error-summary" role="alert"><strong>{result?.message ?? 'Review the highlighted fields.'}</strong><span>Your values have been preserved. {result?.recoverable && 'You can retry safely.'}</span></div>}
      <fieldset disabled={availability !== 'available' || stage === 'submitting'}>
        <div className="field-pair">
          <div><label>Name<input id="contact-name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'contact-name-error' : undefined} name="name" maxLength="100" value={form.name} onChange={update} autoComplete="name"/></label><FieldError id="contact-name-error">{errors.name}</FieldError></div>
          <div><label>Email<input id="contact-email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'contact-email-error' : undefined} type="email" name="email" maxLength="254" value={form.email} onChange={update} autoComplete="email"/></label><FieldError id="contact-email-error">{errors.email}</FieldError></div>
        </div>
        <label>Enquiry type<select id="contact-topic" aria-invalid={Boolean(errors.topic)} aria-describedby={errors.topic ? 'contact-topic-error' : undefined} name="topic" value={form.topic} onChange={update}><option value="">Choose a topic</option><option>Collecting concept</option><option>Creator support</option><option>Partnerships</option><option>Press</option></select></label><FieldError id="contact-topic-error">{errors.topic}</FieldError>
        <label>Message<textarea id="contact-message" aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? 'contact-message-error contact-privacy' : 'contact-privacy'} rows="5" name="message" minLength="20" maxLength="3000" value={form.message} onChange={update} placeholder="How can we help?"/></label><FieldError id="contact-message-error">{errors.message}</FieldError>
        <ConsentField id="contact-consent" checked={form.consent} onChange={update} error={errors.consent}>{IS_DEMO_MODE ? 'I understand this is a local demonstration and my message will not be sent or stored.' : 'I agree that FashionXpress may process this information to respond to my enquiry.'}</ConsentField>
        <Honeypot prefix="contact" value={form.website} onChange={update}/>
        <p id="contact-privacy" className="prototype-note">{IS_DEMO_MODE ? 'Portfolio Demo—nothing is sent, emailed, or saved.' : 'Your message is stored securely through Supabase and notification email is processed by Resend.'}</p>
        <div className="workflow-action">{IS_DEMO_MODE && <PortfolioDemoIndicator/>}<button className="button" type="submit" disabled={availability !== 'available' || stage === 'submitting'}>{stage === 'submitting' ? IS_DEMO_MODE ? 'Completing demo…' : 'Sending securely…' : <>{IS_DEMO_MODE ? 'Complete contact demo' : 'Send message'} <Icon name="arrow" size={16}/></>}</button></div>
      </fieldset>
    </form>}
  </section>
}
