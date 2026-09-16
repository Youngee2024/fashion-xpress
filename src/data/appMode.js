export function normalizeAppMode(value) {
  return value === 'live' ? 'live' : 'demo'
}

export const APP_MODE = normalizeAppMode(import.meta.env?.VITE_APP_MODE)
export const IS_DEMO_MODE = APP_MODE === 'demo'
