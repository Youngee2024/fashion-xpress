const emailPattern = /^\S+@\S+\.\S+$/

function required(value, label) {
  return value.trim() ? '' : `${label} is required.`
}

export function validateContact(form) {
  return {
    name: required(form.name, 'Name'),
    email: required(form.email, 'Email') || (!emailPattern.test(form.email) ? 'Enter a valid email address.' : ''),
    topic: required(form.topic, 'Topic'),
    message: required(form.message, 'Message') || (form.message.trim().length < 20 ? 'Add at least 20 characters so the message has enough context.' : ''),
  }
}

export function validateCreator(form) {
  let portfolio = required(form.portfolio, 'Portfolio URL')
  if (!portfolio) {
    try {
      const url = new URL(form.portfolio)
      if (!['http:', 'https:'].includes(url.protocol)) portfolio = 'Use an http or https portfolio URL.'
    } catch {
      portfolio = 'Enter a complete portfolio URL, including https://.'
    }
  }
  return {
    name: required(form.name, 'Name'),
    email: required(form.email, 'Email') || (!emailPattern.test(form.email) ? 'Enter a valid email address.' : ''),
    portfolio,
    specialty: required(form.specialty, 'Design practice'),
    vision: required(form.vision, 'Vision') || (form.vision.trim().length < 30 ? 'Add at least 30 characters to develop the idea.' : ''),
  }
}

export function hasErrors(errors) {
  return Object.values(errors).some(Boolean)
}
