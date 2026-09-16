import { handleWorkflow } from '../../server/runtime.js'
import { newsletterUnsubscribeWorkflow } from '../../server/workflows.js'

export default {
  fetch: (request) => handleWorkflow(request, newsletterUnsubscribeWorkflow),
}
