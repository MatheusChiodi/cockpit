import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

const INTERVAL_MINUTES = 60
const TICK_MS = 60000
// A prompt or a tool call within this window means the session is in use.
const ACTIVE_MS = 10 * 60000

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Module state: a reload drops it along with the old environment.
const use = { at: Number.NEGATIVE_INFINITY, minutes: 0 }

const tick = async ($: EngineInterface): Promise<void> => {
  if ((await $.clock.now()) - use.at > ACTIVE_MS) {
    return
  }

  use.minutes += 1

  if (use.minutes >= INTERVAL_MINUTES) {
    use.minutes = 0
    $.ui.toast((await strings($)).drink, { timeoutMs: 15000 })
  }
}

export const register: Register = on => {
  on('session.start', ($, e, next) => {
    use.minutes = 0

    if (e.isInteractive) {
      $.clock.every(TICK_MS, () => void tick($))
    }

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    use.at = await $.clock.now()

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    use.at = await $.clock.now()

    return next(e)
  })
}
