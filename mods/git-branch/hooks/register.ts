import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const NAME = /^[A-Za-z0-9_][A-Za-z0-9._/-]*$/

const git = ($: EngineInterface, args: readonly string[]) =>
  $.process.run(['git', '--no-pager', ...args], { timeoutMs: 10000 }).catch(() => undefined)

const branches = async ($: EngineInterface): Promise<{ text: string }> => {
  const s = await strings($)
  const ran = await git($, ['branch', '--format=%(HEAD) %(refname:short)'])

  if (ran === undefined || ran.exitCode !== 0) {
    return { text: s.noGit }
  }

  const lines = ran.stdout
    .split('\n')
    .map(line => line.trimEnd())
    .filter(line => line !== '')
    .map(line => (line.startsWith('*') ? `● ${line.slice(2)}` : `  ${line.slice(2)}`))

  return { text: lines.length === 0 ? s.none : lines.join('\n') }
}

const switchTo = async ($: EngineInterface, name: string): Promise<{ text: string }> => {
  const s = await strings($)
  const known = await git($, ['rev-parse', '--verify', '--quiet', `refs/heads/${name}`])

  if (known === undefined) {
    return { text: s.noGit }
  }

  const exists = known.exitCode === 0
  const ran = await git($, exists ? ['switch', name] : ['switch', '-c', name])

  if (ran === undefined) {
    return { text: s.noGit }
  }

  if (ran.exitCode !== 0) {
    return { text: s.failed(ran.stderr.trim().split('\n')[0] ?? '') }
  }

  return { text: exists ? s.switched(name) : s.created(name) }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'gb', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'gb' }, async ($, e) => {
    const name = e.args.trim()

    if (name === '') {
      return branches($)
    }

    if (!NAME.test(name)) {
      return { text: (await strings($)).usage }
    }

    return switchTo($, name)
  })
}
