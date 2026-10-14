import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Runs git on the host; undefined when git cannot start.
const git = async ($: EngineInterface, args: readonly string[]) =>
  $.process.run(['git', '--no-pager', ...args], { timeoutMs: 15000 }).catch(() => undefined)

// A count argument: empty gives the fallback, anything outside 1..max gives undefined.
const limitOf = (typed: string, fallback: number, max: number): number | undefined => {
  const asked = typed === '' ? fallback : Number(typed)

  return Number.isInteger(asked) && asked >= 1 && asked <= max ? asked : undefined
}

const CAP = 30

const recent = async ($: EngineInterface, typed: string): Promise<{ text: string }> => {
  const s = await strings($)
  const asked = limitOf(typed, 15, CAP)

  if (asked === undefined) {
    return { text: s.usage }
  }

  const ran = await git($, ['log', '-n', '100', '--name-only', '--no-color', '--format=@%ar'])

  if (ran === undefined || ran.exitCode !== 0) {
    return { text: s.noGit }
  }

  // Newest commit first, so the first time a file shows up is its latest change.
  const seen = new Map<string, string>()
  let when = ''

  for (const line of ran.stdout.split('\n')) {
    if (line.startsWith('@')) {
      when = line.slice(1)
    } else if (line.trim() !== '' && !seen.has(line)) {
      seen.set(line, when)
    }
  }

  const entries = [...seen]

  if (entries.length === 0) {
    return { text: s.none }
  }

  const shown = entries.slice(0, asked)
  const width = Math.max(...shown.map(([, at]) => at.length))
  const rows = shown.map(([path, at]) => `${at.padEnd(width)}  ${path}`)

  return { text: (entries.length > asked ? [...rows, s.more(entries.length - asked)] : rows).join('\n') }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'recent', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'recent' }, ($, e) => recent($, e.args.trim()))
}
