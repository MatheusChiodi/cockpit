import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('cost-trend')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const WINDOW = 10
const HALF = WINDOW / 2
// The newer half must differ from the older by this much to count as a trend.
const SHIFT = 0.25

// Module state: a reload drops it along with the old environment.
const spent = { total: 0, turns: [] as number[] }

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0)

const arrow = (turns: number[]): string => {
  if (turns.length < WINDOW) {
    return ''
  }

  const before = sum(turns.slice(0, HALF))
  const after = sum(turns.slice(HALF))

  return after > before * (1 + SHIFT) ? ' ↑' : after < before * (1 - SHIFT) ? ' ↓' : ''
}

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('turn.start', ($, e, next) => {
    spent.turns.push(0)
    spent.turns = spent.turns.slice(-WINDOW)

    return next(e)
  })

  // What each turn cost is the growth of the session total while it ran.
  on('session.measure', async ($, e, next) => {
    if (e.cost !== undefined) {
      const grown = Math.max(0, e.cost.usd - spent.total)
      spent.total = e.cost.usd

      if (spent.turns.length > 0) {
        spent.turns = [...spent.turns.slice(0, -1), (spent.turns.at(-1) ?? 0) + grown]
        const s = await strings($)
        void show($, `${s.label(spent.turns.length)} US$ ${sum(spent.turns).toFixed(2)}${arrow(spent.turns)}`)
      }
    }

    return next(e)
  })
}
