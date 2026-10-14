import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const CAP = 20

// 0 is the file named exactly like the text, then names that start with it, then names that hold it, then paths.
const rank = (path: string, text: string): number => {
  const name = path.slice(path.lastIndexOf('/') + 1).toLowerCase()
  const stem = name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : name

  if (name === text || stem === text) return 0
  if (name.startsWith(text)) return 1
  if (name.includes(text)) return 2

  return 3
}

const find = async ($: EngineInterface, typed: string): Promise<{ text: string }> => {
  const s = await strings($)
  const text = typed.toLowerCase()

  if (text === '') {
    return { text: s.usage }
  }

  const ran = await $.process
    .run(['git', '--no-pager', 'ls-files'], { timeoutMs: 15000 })
    .catch(() => undefined)

  if (ran === undefined || ran.exitCode !== 0) {
    return { text: s.noGit }
  }

  const matches = ran.stdout
    .split('\n')
    .map(line => line.trim())
    .filter(path => path !== '' && path.toLowerCase().includes(text))
    .map(path => ({ path, rank: rank(path, text) }))
    .sort((a, b) => a.rank - b.rank || a.path.length - b.path.length || a.path.localeCompare(b.path))

  if (matches.length === 0) {
    return { text: s.none(typed) }
  }

  const shown = matches.slice(0, CAP).map(match => match.path)
  const count = matches.length > CAP ? s.capped(shown.length, matches.length) : s.total(matches.length)

  return { text: [...shown, count].join('\n') }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'ff', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'ff' }, ($, e) => find($, e.args.trim()))
}
