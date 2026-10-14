import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// An epoch of 11 digits or more is milliseconds; below that, seconds.
const MILLIS_FROM = 1e11

// The moment (ms) an argument stands for, and which unit an epoch was read as; undefined when it is neither.
const moment = (text: string): { ms: number; unit?: 'seconds' | 'millis' } | undefined => {
  if (/^-?\d+(\.\d+)?$/.test(text)) {
    const n = Number(text)
    const isMillis = Math.abs(n) >= MILLIS_FROM

    return { ms: isMillis ? n : n * 1000, unit: isMillis ? 'millis' : 'seconds' }
  }

  const ms = Date.parse(text)

  return Number.isNaN(ms) ? undefined : { ms }
}

const span = (ms: number, s: (typeof STRINGS)['en']): string => {
  const seconds = Math.round(Math.abs(ms) / 1000)
  const { d, h, m, s: sec } = s.units

  if (seconds >= 86400) {
    return `${Math.floor(seconds / 86400)}${d} ${Math.floor((seconds % 86400) / 3600)}${h}`
  }

  if (seconds >= 3600) {
    return `${Math.floor(seconds / 3600)}${h} ${Math.floor((seconds % 3600) / 60)}${m}`
  }

  return seconds >= 60 ? `${Math.floor(seconds / 60)}${m} ${seconds % 60}${sec}` : `${seconds}${sec}`
}

const table = (ms: number, now: number, s: (typeof STRINGS)['en']): string => {
  const date = new Date(ms)
  const diff = ms - now
  const relative = Math.abs(diff) < 1000 ? s.now : diff < 0 ? s.ago(span(diff, s)) : s.ahead(span(diff, s))
  const rows: [string, string][] = [
    [s.seconds, String(Math.floor(ms / 1000))],
    [s.millis, String(Math.trunc(ms))],
    [s.iso, date.toISOString()],
    [s.local, date.toLocaleString(s.locale)],
    [s.relative, relative],
  ]
  const width = Math.max(...rows.map(([label]) => label.length))

  return rows.map(([label, value]) => `${label.padEnd(width)}  ${value}`).join('\n')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'ts', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'ts' }, async ($, e) => {
    const s = await strings($)
    const text = e.args.trim()
    const now = await $.clock.now()
    const found = text === '' ? { ms: now } : moment(text)

    if (found === undefined || Math.abs(found.ms) > 8.64e15) {
      return { text: s.usage }
    }

    const note =
      found.unit === undefined ? '' : `\n${s.guess(found.unit === 'millis' ? s.unitMillis : s.unitSeconds)}`

    return { text: `${table(found.ms, now, s)}${note}` }
  })
}
