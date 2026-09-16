import { useEffect, useState } from 'react'
import { workflowAvailability } from '../data/workflowApi'

export function useWorkflowAvailability() {
  const [status, setStatus] = useState('checking')
  useEffect(() => {
    const controller = new AbortController()
    workflowAvailability(controller.signal).then((available) => setStatus(available ? 'available' : 'unavailable'))
    return () => controller.abort()
  }, [])
  return status
}
