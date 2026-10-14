import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const EVERY_MINUTES = 50

// A top-level function, because `$` may only be passed to one.
const remind = async ($: EngineInterface, rounds: number): Promise<void> => {
  const s = await strings($)

  $.ui.toast(`${s.session(rounds * EVERY_MINUTES)} ${s.tips[rounds % s.tips.length] ?? ''}`, { timeoutMs: 20000 })
}

export const register: Register = on => {
  on('session.start', ($, e, next) => {
    let rounds = 0

    // The timer dies on its own when the module reloads.
    $.clock.every(EVERY_MINUTES * 60000, () => {
      rounds += 1
      void remind($, rounds)
    })

    return next(e)
  })
}
