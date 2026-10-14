import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

type Day = { sessions: number; prompts: number }
type Days = Record<string, Day>

// Days of counts kept in the store; a recap needs the previous week only.
const KEEP_DAYS = 30

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const pad = (value: number): string => String(value).padStart(2, '0')

// Local calendar day as YYYY-MM-DD, so days turn over at the person's midnight and sort as text.
const keyOf = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const addDays = (date: Date, days: number): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)

// Weeks run Monday to Sunday.
const mondayOf = (date: Date): Date => addDays(date, -((date.getDay() + 6) % 7))

const loadDays = async ($: EngineInterface): Promise<Days> => {
  const held = await $.store.get('days')

  return typeof held === 'object' && held !== null && !Array.isArray(held) ? (held as Days) : {}
}

const bump = async ($: EngineInterface, field: keyof Day): Promise<void> => {
  const today = new Date(await $.clock.now())
  const key = keyOf(today)
  const days = await loadDays($)
  const day = days[key] ?? { sessions: 0, prompts: 0 }
  const oldest = keyOf(addDays(today, -KEEP_DAYS))
  const kept = Object.entries({ ...days, [key]: { ...day, [field]: day[field] + 1 } }).filter(([at]) => at >= oldest)

  await $.store.set('days', Object.fromEntries(kept))
}

// The week before the one `monday` starts, as days active, sessions and prompts.
const lastWeek = (days: Days, monday: Date): { active: number; sessions: number; prompts: number } => {
  const total = { active: 0, sessions: 0, prompts: 0 }

  for (let offset = -7; offset < 0; offset += 1) {
    const day = days[keyOf(addDays(monday, offset))]

    if (day !== undefined && (day.sessions > 0 || day.prompts > 0)) {
      total.active += 1
      total.sessions += day.sessions
      total.prompts += day.prompts
    }
  }

  return total
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const thisWeek = keyOf(mondayOf(new Date(await $.clock.now())))
    const seen = await $.store.get('week')

    // The first session seen in a new week brings last week's numbers, once.
    if (typeof seen === 'string' && seen < thisWeek && e.isInteractive) {
      const total = lastWeek(await loadDays($), mondayOf(new Date(await $.clock.now())))

      if (total.active > 0) {
        $.ui.toast((await strings($)).recap(total.active, total.sessions, total.prompts), { timeoutMs: 20000 })
      }
    }

    await $.store.set('week', thisWeek)
    await bump($, 'sessions')

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.origin.kind === 'composer' || e.origin.kind === 'bridge') {
      await bump($, 'prompts')
    }

    return next(e)
  })
}
