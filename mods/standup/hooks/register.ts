import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const two = (n: number): string => String(n).padStart(2, '0')

// 2026-10-13 from the local date, `back` days before `ms`.
const day = (ms: number, back = 0): string => {
  const d = new Date(ms)
  d.setDate(d.getDate() - back)

  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`
}

// Commit lines (`day<TAB>subject`, newest first) grouped by day, oldest day and oldest commit first.
const group = (log: string, today: string, yesterday: string, s: (typeof STRINGS)['en']): string => {
  const days = new Map<string, string[]>()

  for (const line of log.split('\n').reverse()) {
    const [date = '', ...subject] = line.trim().split('\t')

    if (date !== '' && subject.length > 0) {
      days.set(date, [...(days.get(date) ?? []), subject.join('\t')])
    }
  }

  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, subjects]) => {
      const label = date === today ? ` (${s.today})` : date === yesterday ? ` (${s.yesterday})` : ''

      return [`${date}${label}`, ...subjects.map(subject => `- ${subject}`)].join('\n')
    })
    .join('\n\n')
}

const firstLine = (text: string): string => text.trim().split('\n')[0] ?? ''

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'standup', description: s.command })

    return next(e)
  })

  on('command.run', { command: 'standup' }, async ($, e) => {
    const s = await strings($)
    const now = await $.clock.now()
    const since = `${day(now, 1)} 00:00`

    try {
      const who = await $.process.run(['git', 'config', 'user.email'])
      const email = who.stdout.trim()

      if (who.exitCode !== 0 || email === '') {
        return { text: s.noEmail }
      }

      const log = await $.process.run([
        'git',
        'log',
        '--all',
        '--no-merges',
        `--since=${since}`,
        '--fixed-strings',
        '--regexp-ignore-case',
        `--author=${email}`,
        '--date=format-local:%Y-%m-%d',
        '--pretty=format:%ad%x09%s',
      ])

      if (log.exitCode !== 0) {
        return { text: s.notRepo(firstLine(log.stderr)) }
      }

      const text = group(log.stdout, day(now), day(now, 1), s)

      if (text === '') {
        return { text: s.none(since) }
      }

      await $.ui.copy({ text })

      return { text: `${text}\n\n${s.copied}` }
    } catch (error) {
      return { text: s.notRepo(error instanceof Error ? error.message : String(error)) }
    }
  })
}
