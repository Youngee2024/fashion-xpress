import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icons'
import { DemoComplete, FieldError } from '../components/PrototypeUI'
import { hasErrors, validateContact } from '../data/formValidation'

const initialForm = { name: '', email: '', topic: '', message: '' }

export function Contact() {
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
    const nextErrors = validateContact(form)
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) {
      setStage('editing')
      document.getElementById(`contact-${Object.keys(nextErrors).find((key) => nextErrors[key])}`)?.focus()
      return
    }
    setStage('reviewing')
    timerRef.current = window.setTimeout(() => setStage('complete'), 450)
  }

  return <section className="form-page page-shell"><div className="form-intro"><span className="eyebrow">Contact concept</span><h1>Message<br/><em>the future.</em></h1><p>Test the complete contact-form experience or use the direct email links below.</p><div className="contact-list"><div><span>General</span><a href="mailto:hello@fashionxpress.com">hello@fashionxpress.com</a></div><div><span>Creators</span><a href="mailto:creators@fashionxpress.com">creators@fashionxpress.com</a></div></div></div>{stage === 'complete' ? <DemoComplete title="Contact journey demonstrated." onReset={() => { setForm(initialForm); setErrors({}); setStage('editing') }}>No message or personal information was transmitted. Use a direct email link if you need to make real contact.</DemoComplete> : <form className="editorial-form" noValidate onSubmit={submit} aria-busy={stage === 'reviewing'}><div className="form-heading"><span className="eyebrow">Interactive form demo</span><h2>Compose your message.</h2></div>{hasErrors(errors) && <div className="error-summary" role="alert"><strong>Review the highlighted fields.</strong><span>Your values have been preserved.</span></div>}<div className="field-pair"><label>Name<input id="contact-name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'contact-name-error' : undefined} name="name" value={form.name} onChange={update} autoComplete="name"/></label><FieldError id="contact-name-error">{errors.name}</FieldError><label>Email<input id="contact-email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'contact-email-error' : undefined} type="email" name="email" value={form.email} onChange={update} autoComplete="email"/></label><FieldError id="contact-email-error">{errors.email}</FieldError></div><label>Topic<select id="contact-topic" aria-invalid={Boolean(errors.topic)} aria-describedby={errors.topic ? 'contact-topic-error' : undefined} name="topic" value={form.topic} onChange={update}><option value="">Choose a topic</option><option>Collecting concept</option><option>Creator support</option><option>Partnerships</option><option>Press</option></select></label><FieldError id="contact-topic-error">{errors.topic}</FieldError><label>Message<textarea id="contact-message" aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? 'contact-message-error contact-privacy' : 'contact-privacy'} rows="5" name="message" value={form.message} onChange={update} placeholder="How can we help?"/></label><FieldError id="contact-message-error">{errors.message}</FieldError><p id="contact-privacy" className="prototype-note">Portfolio prototype—validated locally; nothing is sent or stored.</p><button className="button" type="submit" disabled={stage === 'reviewing'}>{stage === 'reviewing' ? 'Checking demo locally…' : <>Complete form demo <Icon name="arrow" size={16}/></>}</button></form>}</section>
}
