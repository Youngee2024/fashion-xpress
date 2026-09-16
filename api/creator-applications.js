import { handleWorkflow } from '../server/runtime.js'
import { creatorWorkflow } from '../server/workflows.js'

export default {
  fetch: (request) => handleWorkflow(request, creatorWorkflow),
}
