import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('day-timer')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const ACTIVE_WINDOW_MS = 5 * 60000

const activity = { lastAt: 0 }

const dayOf = (ms: number): string => {
  const date = new Date(ms)

  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

const display = async ($: EngineInterface, minutes: number): Promise<void> => {
  const s = await strings($)

  void show($, s.active(Math.floor(minutes / 60), String(minutes % 60).padStart(2, '0')))
}

// Every minute with recent activity (prompt or tool) adds a minute to the day, across sessions.
const tick = async ($: EngineInterface): Promise<void> => {
  const now = await $.clock.now()
  const key = `minutes:${dayOf(now)}`
  const held = Number((await $.store.get(key)) ?? 0)
  const minutes = now - activity.lastAt <= ACTIVE_WINDOW_MS ? held + 1 : held

  if (minutes !== held) {
    await $.store.set(key, minutes)
  }

  await display($, minutes)
}

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.start', async ($, e, next) => {
    await display($, Number((await $.store.get(`minutes:${dayOf(await $.clock.now())}`)) ?? 0))
    $.clock.every(60000, () => void tick($))

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    activity.lastAt = await $.clock.now()

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    activity.lastAt = await $.clock.now()

    return next(e)
  })
}
