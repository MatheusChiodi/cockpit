import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Runs git on the host; undefined when git cannot start.
const git = async ($: EngineInterface, args: readonly string[]) =>
  $.process.run(['git', '--no-pager', ...args], { timeoutMs: 15000 }).catch(() => undefined)

const human = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let at = 0

  while (value >= 1024 && at < units.length - 1) {
    value /= 1024
    at += 1
  }

  return `${value.toFixed(1)} ${units[at]}`
}

// A count argument: empty gives the fallback, anything outside 1..max gives undefined.
const limitOf = (typed: string, fallback: number, max: number): number | undefined => {
  const asked = typed === '' ? fallback : Number(typed)

  return Number.isInteger(asked) && asked >= 1 && asked <= max ? asked : undefined
}

const CAP = 30

const big = async ($: EngineInterface, typed: string): Promise<{ text: string }> => {
  const s = await strings($)
  const asked = limitOf(typed, 15, CAP)

  if (asked === undefined) {
    return { text: s.usage }
  }

  const ran = await git($, ['ls-tree', '-r', '-l', 'HEAD'])

  if (ran === undefined || ran.exitCode !== 0) {
    return { text: s.noGit }
  }

  const files = ran.stdout
    .split('\n')
    .flatMap(line => {
      const found = /^\d+ blob \w+\s+(\d+)\t(.+)$/.exec(line)

      return found === null ? [] : [{ size: Number(found[1]), path: found[2] ?? '' }]
    })
    .sort((a, b) => b.size - a.size)

  if (files.length === 0) {
    return { text: s.none }
  }

  const rows = files.slice(0, asked).map(file => `${human(file.size).padStart(9)}  ${file.path}`)

  return { text: [...rows, s.footer(rows.length, files.length)].join('\n') }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'big', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'big' }, ($, e) => big($, e.args.trim()))
}
