import { useEffect, useState } from 'react'
import { IS_DEMO_MODE } from '../data/appMode'
import { workflowAvailability } from '../data/workflowApi'

export function useWorkflowAvailability() {
  const [status, setStatus] = useState(IS_DEMO_MODE ? 'available' : 'checking')
  useEffect(() => {
    if (IS_DEMO_MODE) return undefined
    const controller = new AbortController()
    workflowAvailability(controller.signal).then((available) => setStatus(available ? 'available' : 'unavailable'))
    return () => controller.abort()
  }, [])
  return status
}
