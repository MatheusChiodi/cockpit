import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const gh = ($: EngineInterface, args: readonly string[]) =>
  $.process.run(['gh', ...args], { timeoutMs: 30000 }).catch(() => undefined)

type Check = { name?: string; bucket?: string; link?: string }

const parse = <T>(text: string | undefined): T | undefined => {
  try {
    return text === undefined ? undefined : (JSON.parse(text) as T)
  } catch {
    return undefined
  }
}

const MAX_LISTED = 12

const checking = async ($: EngineInterface): Promise<{ text: string }> => {
  const s = await strings($)
  const view = await gh($, ['pr', 'view', '--json', 'number'])
  const number = view?.exitCode === 0 ? parse<{ number?: number }>(view.stdout)?.number : undefined
  // `gh pr checks` exits non-zero while checks fail or run, but still prints the JSON.
  const ran = number === undefined ? undefined : await gh($, ['pr', 'checks', '--json', 'name,bucket,link'])
  const checks = parse<Check[]>(ran?.stdout)

  if (number === undefined || checks === undefined) {
    return { text: number === undefined ? s.noGh : s.noChecks(number) }
  }

  if (checks.length === 0) {
    return { text: s.noChecks(number) }
  }

  const failed = checks.filter(check => check.bucket === 'fail' || check.bucket === 'cancel')
  const pending = checks.filter(check => check.bucket === 'pending')
  const passed = checks.length - failed.length - pending.length
  const rows = [
    ...failed.map(check => `  ✗ ${check.name ?? ''}  ${check.link ?? ''}`.trimEnd()),
    ...pending.map(check => `  … ${check.name ?? ''}`),
  ].slice(0, MAX_LISTED)

  return { text: [s.head(number, passed, failed.length, pending.length), ...rows].join('\n') }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'checks', description: s.command })

    return next(e)
  })

  on('command.run', { command: 'checks' }, $ => checking($))
}
