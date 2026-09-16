import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { ServiceStatus } from '../components/WorkflowUI'
import { submitWorkflow } from '../data/workflowApi'
import { useWorkflowAvailability } from '../hooks/useWorkflowAvailability'

function NewsletterAction({ mode }) {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [stage, setStage] = useState('ready')
  const [message, setMessage] = useState('')
  const [unsubscribeUrl, setUnsubscribeUrl] = useState('')
  const submitting = useRef(false)
  const availability = useWorkflowAvailability()
  const confirming = mode === 'confirm'

  async function submit() {
    if (submitting.current || availability !== 'available' || !token) return
    submitting.current = true
    setStage('submitting')
    const response = await submitWorkflow(`/api/newsletter/${mode}`, { token })
    submitting.current = false
    setMessage(response.message)
    if (response.ok && confirming && response.unsubscribeUrl) setUnsubscribeUrl(response.unsubscribeUrl)
    setStage(response.ok ? 'complete' : 'error')
  }

  return <section className="newsletter-action info-page page-shell"><header><span className="eyebrow">Newsletter preference</span><h1>{confirming ? 'Confirm your place.' : 'Leave the list.'}</h1><p>{confirming ? 'Confirm that you want occasional FashionXpress collection and creator updates.' : 'Use the secure action below to stop FashionXpress newsletter email.'}</p></header><div className="panel action-card"><Icon name={stage === 'complete' ? 'check' : 'spark'} size={28}/><ServiceStatus status={availability} noun="newsletter preference"/>{!token && <p className="form-message error" role="alert">This link is incomplete. Request a new link from the newsletter form.</p>}{message && <p className={stage === 'error' ? 'form-message error' : 'form-message success'} role="status">{message}</p>}{stage !== 'complete' && <button className="button" type="button" onClick={submit} disabled={!token || availability !== 'available' || stage === 'submitting'}>{stage === 'submitting' ? 'Updating securely…' : confirming ? 'Confirm subscription' : 'Unsubscribe'}</button>}{unsubscribeUrl && <Link className="text-link" to={`${new URL(unsubscribeUrl).pathname}${new URL(unsubscribeUrl).search}`}>Save your unsubscribe link →</Link>}<Link className="text-link" to="/">Return home →</Link></div></section>
}

export function NewsletterConfirm() {
  return <NewsletterAction mode="confirm"/>
}

export function NewsletterUnsubscribe() {
  return <NewsletterAction mode="unsubscribe"/>
}
