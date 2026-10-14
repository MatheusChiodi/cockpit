import type { EngineInterface, Register } from 'claude-code'

const MAX_FILES = 20

// Hidden context, read by the model only: English, not translated.
const snapshot = async ($: EngineInterface): Promise<string | undefined> => {
  const ran = await $.process
    .run(['git', 'status', '--porcelain=v1', '--branch'], { timeoutMs: 5000 })
    .catch(() => undefined)

  if (ran === undefined || ran.exitCode !== 0) {
    return undefined
  }

  const [head = '', ...changes] = ran.stdout.split('\n').filter(line => line !== '')
  const listed = changes.slice(0, MAX_FILES).join('\n')
  const more = changes.length > MAX_FILES ? `\n… and ${changes.length - MAX_FILES} more` : ''

  return `Git state right now (${head.replace(/^## /, '')}):\n${changes.length === 0 ? 'clean tree' : `${listed}${more}`}`
}

export const register: Register = on => {
  // Every prompt carries the git state as hidden context: Claude does not need to run git status.
  on('prompt.submit', async ($, e, next) => {
    if (e.origin.kind !== 'composer' || e.text.startsWith('/')) {
      return next(e)
    }

    const state = await snapshot($)

    return state === undefined ? next(e) : next({ ...e, context: [...(e.context ?? []), state] })
  })
}
