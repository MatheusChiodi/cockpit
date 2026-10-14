import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Runs git straight on the host: instant answer, no model turn spent.
const git = async ($: EngineInterface, args: readonly string[]): Promise<{ text: string }> => {
  const s = await strings($)
  const ran = await $.process
    .run(['git', '--no-pager', ...args], { timeoutMs: 10000 })
    .catch(() => undefined)

  if (ran === undefined) {
    return { text: s.noGit }
  }

  const output = (ran.exitCode === 0 ? ran.stdout : ran.stderr).trimEnd()

  return { text: output === '' ? s.noOutput : output.slice(0, 8000) }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'gs', description: s.statusCommand })
    await $.command.register({ name: 'gl', description: s.logCommand, argumentHint: '[n]' })
    await $.command.register({ name: 'gd', description: s.diffCommand })

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
