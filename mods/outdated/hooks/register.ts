import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

type Row = { current?: string; wanted?: string; latest?: string }

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const major = (version: string | undefined): number | undefined => {
  const found = /^(\d+)\./.exec(version ?? '')

  return found === null ? undefined : Number(found[1])
}

const isMajorJump = ({ current, latest }: Row): boolean => {
  const from = major(current)
  const to = major(latest)

  return from !== undefined && to !== undefined && to > from
}

const table = (rows: readonly (readonly string[])[]): string[] => {
  const widths = (rows[0] ?? []).map((_, column) => Math.max(...rows.map(row => (row[column] ?? '').length)))

  return rows.map(row => row.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join('  ').trimEnd())
}

const outdated = async ($: EngineInterface): Promise<{ text: string }> => {
  const s = await strings($)
  const isWindows = (await $.env.get('OS')) === 'Windows_NT'
  const argv = ['npm', 'outdated', '--json']
  const ran = await $.process
    .run(isWindows ? ['cmd', '/c', ...argv] : argv, { timeoutMs: 60000 })
    .catch(() => undefined)

  if (ran === undefined) {
    return { text: s.noNpm }
  }

  // npm exits 1 when something is outdated, so the JSON on stdout decides, not the exit code.
  let found: Record<string, Row> = {}

  if (ran.stdout.trim() !== '') {
    try {
      found = JSON.parse(ran.stdout) as Record<string, Row>
    } catch {
      return { text: s.failed(ran.stderr.trim().split('\n')[0] || ran.stdout.trim().split('\n')[0] || '') }
    }
  } else if (ran.exitCode !== 0) {
    return { text: s.failed(ran.stderr.trim().split('\n')[0] ?? '') }
  }

  const names = Object.keys(found).sort()

  if (names.length === 0) {
    return { text: s.upToDate }
  }

  const rows = names.map(name => [name, found[name]?.current ?? '-', found[name]?.wanted ?? '-', found[name]?.latest ?? '-'])
  const majors = names.filter(name => isMajorJump(found[name] ?? {})).length

  return { text: [...table([s.head, ...rows]), s.summary(names.length, majors)].join('\n') }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'outdated', description: s.command })

    return next(e)
  })

  on('command.run', { command: 'outdated' }, $ => outdated($))
}
