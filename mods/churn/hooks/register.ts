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
const NOISE = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?)$/

const churn = async ($: EngineInterface, typed: string): Promise<{ text: string }> => {
  const s = await strings($)
  const asked = limitOf(typed, 15, CAP)

  if (asked === undefined) {
    return { text: s.usage }
  }

  const ran = await git($, ['log', '-n', '300', '--name-only', '--no-color', '--format=@'])

  if (ran === undefined || ran.exitCode !== 0) {
    return { text: s.noGit }
  }

  const lines = ran.stdout.split('\n')
  const commits = lines.filter(line => line === '@').length
  const tally = new Map<string, number>()

  for (const line of lines) {
    if (line !== '@' && line.trim() !== '' && !NOISE.test(line)) {
      tally.set(line, (tally.get(line) ?? 0) + 1)
    }
  }

  const sorted = [...tally].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

  if (sorted.length === 0) {
    return { text: s.none }
  }

  const rows = sorted.slice(0, asked).map(([path, n]) => `${String(n).padStart(4)}  ${path}`)

  return { text: [s.header(commits), ...rows].join('\n') }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'churn', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'churn' }, ($, e) => churn($, e.args.trim()))
}
