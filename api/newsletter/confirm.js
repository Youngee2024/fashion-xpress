import { handleWorkflow } from '../../server/runtime.js'
import { newsletterConfirmWorkflow } from '../../server/workflows.js'

export default {
  fetch: (request) => handleWorkflow(request, newsletterConfirmWorkflow),
}
