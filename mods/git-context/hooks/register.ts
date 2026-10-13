import type { EngineInterface, Register } from 'claude-code'

const MAX_FILES = 20

const snapshot = async ($: EngineInterface): Promise<string | undefined> => {
  const ran = await $.process
    .run(['git', 'status', '--porcelain=v1', '--branch'], { timeoutMs: 5000 })
    .catch(() => undefined)

  if (ran === undefined || ran.exitCode !== 0) {
    return undefined
  }

  const [head = '', ...changes] = ran.stdout.split('\n').filter(line => line !== '')
  const listed = changes.slice(0, MAX_FILES).join('\n')
  const more = changes.length > MAX_FILES ? `\n… e mais ${changes.length - MAX_FILES}` : ''

  return `Estado do git agora (${head.replace(/^## /, '')}):\n${changes.length === 0 ? 'árvore limpa' : `${listed}${more}`}`
}

export const register: Register = on => {
  // Cada prompt seu leva o estado do git como contexto oculto: o Claude não precisa rodar git status.
  on('prompt.submit', async ($, e, next) => {
    if (e.origin.kind !== 'composer' || e.text.startsWith('/')) {
      return next(e)
    }

    const state = await snapshot($)

    return state === undefined ? next(e) : next({ ...e, context: [...(e.context ?? []), state] })
  })
}
