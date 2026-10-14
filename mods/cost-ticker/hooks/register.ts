import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('cost-ticker')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  let baseline = 0
  let current = 0

  on('turn.start', ($, e, next) => {
    baseline = current

    return next(e)
  })

  // What the turn that just ended cost and the session total, side by side.
  on('session.measure', async ($, e, next) => {
    if (e.cost !== undefined) {
      current = e.cost.usd
      const s = await strings($)
      void show($, `${s.turn} US$ ${Math.max(0, current - baseline).toFixed(2)} · ${s.session} US$ ${current.toFixed(2)}`)
    }

    return next(e)
  })
}
