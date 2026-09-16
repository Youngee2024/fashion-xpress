function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character])
}

function frame(title, intro, content, action) {
  const actionMarkup = action ? `<p style="margin:28px 0"><a href="${escapeHtml(action.url)}" style="background:#c9ff38;color:#0a0a0b;padding:14px 20px;text-decoration:none;font-weight:700">${escapeHtml(action.label)}</a></p>` : ''
  return `<!doctype html><html lang="en"><body style="margin:0;background:#0a0a0b;color:#f5f0e6;font-family:Arial,sans-serif"><main style="max-width:620px;margin:auto;padding:36px 24px"><p style="color:#c9ff38;text-transform:uppercase;letter-spacing:.12em">FashionXpress</p><h1 style="font-family:Georgia,serif;font-size:34px">${escapeHtml(title)}</h1><p style="line-height:1.65;color:#d6d2ca">${escapeHtml(intro)}</p>${content}${actionMarkup}<hr style="border:0;border-top:1px solid #343438;margin:32px 0"><p style="font-size:13px;color:#aaa">FashionXpress · Culture, code, and couture.</p></main></body></html>`
}

function detail(label, value) {
  return `<p><strong style="color:#c9ff38">${escapeHtml(label)}</strong><br><span style="white-space:pre-wrap">${escapeHtml(value)}</span></p>`
}

export function contactAcknowledgement({ name, reference }) {
  const title = 'We received your message.'
  return { to: [name.email], subject: `${reference} · Message received`, html: frame(title, `Hello ${name.name}, your message is safely in our review queue.`, detail('Reference', reference)), text: `${title}\n\nHello ${name.name}, your message is safely in our review queue.\nReference: ${reference}` }
}

export function contactAdmin({ submission, reference, adminTo }) {
  const content = [detail('Reference', reference), detail('Name', submission.name), detail('Email', submission.email), detail('Enquiry type', submission.topic), detail('Message', submission.message)].join('')
  return { to: [adminTo], reply_to: submission.email, subject: `${reference} · New contact message`, html: frame('New contact message', 'A new website message was stored before this notification was sent.', content), text: `New contact message\nReference: ${reference}\nName: ${submission.name}\nEmail: ${submission.email}\nEnquiry type: ${submission.topic}\n\n${submission.message}` }
}

export function creatorAcknowledgement({ submission, reference }) {
  return { to: [submission.email], subject: `${reference} · Application received`, html: frame('Your introduction is in review.', `Hello ${submission.name}, your creator application was stored successfully.`, detail('Reference', reference)), text: `Your creator application was stored successfully.\nReference: ${reference}\n\nSubmitting does not guarantee acceptance or a particular response time.` }
}

export function creatorAdmin({ submission, reference, adminTo }) {
  const content = [detail('Reference', reference), detail('Creator', submission.name), detail('Email', submission.email), detail('Location', submission.location), detail('Practice', submission.specialty), detail('Portfolio', submission.portfolio), detail('Vision', submission.vision)].join('')
  return { to: [adminTo], reply_to: submission.email, subject: `${reference} · New creator application`, html: frame('New creator application', 'A new creator application was stored before this notification was sent.', content), text: `New creator application\nReference: ${reference}\nCreator: ${submission.name}\nEmail: ${submission.email}\nLocation: ${submission.location}\nPractice: ${submission.specialty}\nPortfolio: ${submission.portfolio}\n\n${submission.vision}` }
}

export function newsletterConfirmation({ email, confirmationUrl }) {
  return { to: [email], subject: 'Confirm your FashionXpress newsletter subscription', html: frame('Confirm your place on the front row.', 'You asked to receive FashionXpress collection and creator updates. Confirm below within 24 hours.', '', { label: 'Confirm subscription', url: confirmationUrl }), text: `Confirm your FashionXpress newsletter subscription within 24 hours:\n${confirmationUrl}\n\nIf you did not request this, ignore this message.` }
}

export function newsletterConfirmed({ email, unsubscribeUrl }) {
  return { to: [email], subject: 'Your FashionXpress subscription is confirmed', html: frame('Welcome to the front row.', 'Your newsletter subscription is confirmed. You can leave at any time using the link below.', '', { label: 'Unsubscribe', url: unsubscribeUrl }), text: `Your FashionXpress newsletter subscription is confirmed.\n\nUnsubscribe at any time:\n${unsubscribeUrl}` }
}

export function unsubscribeConfirmation({ email }) {
  return { to: [email], subject: 'You are unsubscribed from FashionXpress', html: frame('You have left the list.', 'Your FashionXpress newsletter subscription is now inactive.', ''), text: 'Your FashionXpress newsletter subscription is now inactive.' }
}
