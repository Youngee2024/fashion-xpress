import { handleWorkflow } from '../server/runtime.js'
import { contactWorkflow } from '../server/workflows.js'

export default {
  fetch: (request) => handleWorkflow(request, contactWorkflow),
}
