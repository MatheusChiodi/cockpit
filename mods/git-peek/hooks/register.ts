import type { EngineInterface, Register } from 'claude-code'

// Roda git direto no host: resposta instantânea, sem gastar um turno do modelo.
const git = async ($: EngineInterface, args: readonly string[]): Promise<{ text: string }> => {
  const ran = await $.process
    .run(['git', '--no-pager', ...args], { timeoutMs: 10000 })
    .catch(() => undefined)

  if (ran === undefined) {
    return { text: 'git não encontrado ou sem resposta.' }
  }

  const output = (ran.exitCode === 0 ? ran.stdout : ran.stderr).trimEnd()

  return { text: output === '' ? '(sem saída)' : output.slice(0, 8000) }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'gs', description: 'git status resumido, sem gastar turno' })
    await $.command.register({ name: 'gl', description: 'Últimos commits (git log --oneline)', argumentHint: '[n]' })
    await $.command.register({ name: 'gd', description: 'Resumo do diff atual (git diff --stat)' })

    return next(e)
  })

  on('command.run', { command: 'gs' }, $ => git($, ['status', '--short', '--branch']))

  on('command.run', { command: 'gl' }, ($, e) => {
    const count = Number(e.args.trim())
    const limit = Number.isInteger(count) && count > 0 && count <= 100 ? count : 10

    return git($, ['log', '--oneline', '--decorate', `-${limit}`])
  })

  on('command.run', { command: 'gd' }, $ => git($, ['diff', '--stat', 'HEAD']))
}
