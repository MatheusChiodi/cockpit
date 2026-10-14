import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('spend-today')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Ledger = Record<string, number>

const dayOf = (ms: number): string => {
  const date = new Date(ms)

  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

// One record per day, with the cost of each session: summing gives the day's spend across sessions.
const record = async ($: EngineInterface, usd: number): Promise<void> => {
  const key = `day:${dayOf(await $.clock.now())}`
  const held = await $.store.get(key)
  const ledger: Ledger = typeof held === 'object' && held !== null ? { ...(held as Ledger) } : {}
  ledger[await $.session.id()] = usd
  await $.store.set(key, ledger)

  const total = Object.values(ledger).reduce((sum, value) => sum + value, 0)
  const sessions = Object.keys(ledger).length

  const s = await strings($)

  void show($, `${s.today} US$ ${total.toFixed(2)} · ${s.sessions(sessions)}`)
}

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.measure', async ($, e, next) => {
    if (e.cost !== undefined) {
      await record($, e.cost.usd)
    }

    return next(e)
  })
}
