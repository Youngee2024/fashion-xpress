import { pathToFileURL } from 'node:url'
import { ENVIRONMENT_CONTRACT, LIVE_CAPABILITIES, inspectVariable } from '../config/environment-contract.js'

export function evaluateReadiness(environment = {}, requestedMode) {
  const rawMode = requestedMode ?? environment.VITE_APP_MODE
  const mode = rawMode === 'live' ? 'live' : 'demo'

  if (requestedMode && requestedMode !== 'demo' && requestedMode !== 'live') {
    return { mode: requestedMode, ready: false, error: 'Mode must be demo or live.', capabilities: [] }
  }

  if (mode === 'demo') {
    return {
      mode,
      ready: true,
      capabilities: [{ name: 'Portfolio Demo', ready: true, variables: [] }],
    }
  }

  const capabilities = Object.entries(LIVE_CAPABILITIES).map(([name, variables]) => ({
    name,
    variables: variables.map((variable) => ({
      variable,
      status: variable === 'VITE_APP_MODE' && environment[variable] !== 'live'
        ? (environment[variable] ? 'invalid' : 'missing')
        : inspectVariable(variable, environment),
    })),
  })).map((capability) => ({
    ...capability,
    ready: capability.variables.every(({ status }) => status === 'plausible'),
  }))

  return { mode, ready: capabilities.every(({ ready }) => ready), capabilities }
}

function parseMode(argumentsList) {
  const modeArgument = argumentsList.find((argument) => argument.startsWith('--mode='))
  return modeArgument?.slice('--mode='.length)
}

function printReport(report, write = console.log) {
  write(`FashionXpress readiness: ${report.mode} mode`)
  if (report.error) {
    write(`FAIL: ${report.error}`)
    return
  }
  for (const capability of report.capabilities) {
    write(`${capability.ready ? 'READY' : 'UNAVAILABLE'}: ${capability.name}`)
    for (const { variable, status } of capability.variables) write(`  ${variable}: ${status}`)
  }
  write(report.ready ? 'Readiness check passed.' : 'Readiness check failed closed; Live Mode must not be activated.')
}

export function runReadiness({ environment = process.env, argumentsList = process.argv.slice(2), write = console.log } = {}) {
  const report = evaluateReadiness(environment, parseMode(argumentsList))
  printReport(report, write)
  return report.ready ? 0 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runReadiness()
}

export { ENVIRONMENT_CONTRACT }
