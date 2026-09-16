import { deleteAccountRequest } from '../../server/deleteAccount.js'

export default { fetch: (request) => deleteAccountRequest(request) }
