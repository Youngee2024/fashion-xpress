import { handleWorkflow } from '../../server/runtime.js'
import { newsletterSubscribeWorkflow } from '../../server/workflows.js'

export default {
  fetch: (request) => handleWorkflow(request, newsletterSubscribeWorkflow),
}
