import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

type Last = { text: string; at: number }

const MINUTE = 60000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
// Older than this is another piece of work, and the line stays silent.
const MAX_AGE_MS = 3 * DAY
// Shorter prompts ("ok", "go on") say nothing about what the work was.
const MIN_LENGTH = 12
const MAX_LENGTH = 80
const TOAST_MS = 15000

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

type Strings = (typeof STRINGS)['en']

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// One line per project: the store key is the session's root.
const keyOf = async ($: EngineInterface): Promise<string> => `resume:${await $.session.root()}`

const whenOf = (s: Strings, age: number): string => {
  if (age < HOUR) {
    return s.minutes(Math.max(1, Math.round(age / MINUTE)))
  }

  if (age < DAY) {
    return s.hours(Math.round(age / HOUR))
  }

  return age < 2 * DAY ? s.yesterday : s.days(Math.floor(age / DAY))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const held = await $.store.get(await keyOf($))
    const last = typeof held === 'object' && held !== null ? (held as Last) : undefined

    if (e.isInteractive && last !== undefined) {
      const age = (await $.clock.now()) - last.at

      if (age >= 0 && age < MAX_AGE_MS) {
        const s = await strings($)
        $.ui.toast(s.last(whenOf(s, age), last.text), { timeoutMs: TOAST_MS })
      }
    }

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    const text = e.text.trim().replace(/\s+/g, ' ')

    if (text.length >= MIN_LENGTH && !text.startsWith('/')) {
      const short = text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH - 1)}…` : text
      await $.store.set(await keyOf($), { text: short, at: await $.clock.now() })
    }

    return next(e)
  })
}
