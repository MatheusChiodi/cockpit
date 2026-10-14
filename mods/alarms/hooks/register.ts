import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

type Alarm = { time: string; text: string; day: string }

const TICK_MS = 30000
// An alarm rings within this many minutes after its time; a session opened later stays silent.
const GRACE_MINUTES = 30
const MAX_ALARMS = 20
const WANTED = /^(\d{1,2}):(\d{2})\s+(\S[\s\S]*)$/

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const pad = (value: number): string => String(value).padStart(2, '0')

// Local calendar day, so an alarm rings once per day of the person's clock.
const dayOf = (ms: number): string => {
  const date = new Date(ms)

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const minuteOf = (ms: number): number => {
  const date = new Date(ms)

  return date.getHours() * 60 + date.getMinutes()
}

const minutesOf = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)

  return (hours ?? 0) * 60 + (minutes ?? 0)
}

const load = async ($: EngineInterface): Promise<Alarm[]> => {
  const held = await $.store.get('alarms')

  return Array.isArray(held) ? (held as Alarm[]) : []
}

const tick = async ($: EngineInterface): Promise<void> => {
  const now = await $.clock.now()
  const today = dayOf(now)
  const alarms = await load($)
  const due = alarms.filter(alarm => {
    const late = minuteOf(now) - minutesOf(alarm.time)

    return alarm.day !== today && late >= 0 && late <= GRACE_MINUTES
  })

  if (due.length === 0) {
    return
  }

  await $.store.set('alarms', alarms.map(alarm => (due.includes(alarm) ? { ...alarm, day: today } : alarm)))
  const s = await strings($)

  for (const alarm of due) {
    $.ui.toast(s.ring(alarm.time, alarm.text), { timeoutMs: 20000 })
    await $.ui.notify(alarm.text, { title: s.title(alarm.time) }).catch(() => undefined)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'alarm', description: s.command, argumentHint: s.hint })

    if (e.isInteractive) {
      $.clock.every(TICK_MS, () => void tick($))
      void tick($)
    }

    return next(e)
  })

  on('command.run', { command: 'alarm' }, async ($, e) => {
    const s = await strings($)
    const args = e.args.trim()
    const alarms = await load($)
    const [action, value] = args.split(/\s+/)

    if (action === 'list') {
      return {
        text:
          alarms.length === 0 ? s.empty : alarms.map((alarm, index) => `${index + 1}. ${alarm.time}  ${alarm.text}`).join('\n'),
      }
    }

    if (action === 'rm') {
      const index = Number(value) - 1

      if (!Number.isInteger(index) || alarms[index] === undefined) {
        return { text: s.missing(value ?? '') }
      }

      await $.store.set('alarms', alarms.filter((_, at) => at !== index))

      return { text: s.removed(index + 1) }
    }

    const wanted = WANTED.exec(args)
    const hours = Number(wanted?.[1])
    const minutes = Number(wanted?.[2])

    if (wanted === null || hours > 23 || minutes > 59) {
      return { text: s.usage }
    }

    if (alarms.length >= MAX_ALARMS) {
      return { text: s.full(MAX_ALARMS) }
    }

    const now = await $.clock.now()
    const time = `${pad(hours)}:${pad(minutes)}`
    const text = (wanted[3] ?? '').trim()
    // A time already past today first rings tomorrow.
    const day = minuteOf(now) >= minutesOf(time) ? dayOf(now) : ''
    const next = [...alarms, { time, text, day }].sort((a, b) => minutesOf(a.time) - minutesOf(b.time))
    await $.store.set('alarms', next)

    return { text: s.added(next.findIndex(alarm => alarm.time === time && alarm.text === text) + 1, time, text) }
  })
}
