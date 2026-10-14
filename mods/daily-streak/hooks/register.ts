import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

type Streak = { day: string; count: number; best: number }

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const DAY_MS = 86400000

// Local day as YYYY-MM-DD, so the streak rolls over at the user's midnight.
const dayOf = (ms: number): string => {
  const date = new Date(ms)

  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

const held = async ($: EngineInterface): Promise<Streak | undefined> => {
  const value = await $.store.get('streak')

  return typeof value === 'object' && value !== null ? (value as Streak) : undefined
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'streak', description: s.command })

    const now = await $.clock.now()
    const today = dayOf(now)
    const before = await held($)

    if (before?.day !== today) {
      const count = before?.day === dayOf(now - DAY_MS) ? before.count + 1 : 1
      const streak: Streak = { day: today, count, best: Math.max(count, before?.best ?? 0) }
      await $.store.set('streak', streak)

      if (e.isInteractive) {
        $.ui.toast(s.line(streak.count, streak.best), { timeoutMs: 8000 })
      }
    }

    return next(e)
  })

  on('command.run', { command: 'streak' }, async $ => {
    const s = await strings($)
    const streak = await held($)

    return { text: streak === undefined ? s.none : s.line(streak.count, streak.best) }
  })
}
