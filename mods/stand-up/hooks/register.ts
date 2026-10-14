import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

const WORK_MINUTES = 120
const TICK_MS = 60000
// Idle for this long counts as a break and starts the two hours over.
const BREAK_MS = 10 * 60000

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Module state: a reload drops it along with the old environment.
const use = { at: Number.NEGATIVE_INFINITY, minutes: 0 }

const tick = async ($: EngineInterface): Promise<void> => {
  if ((await $.clock.now()) - use.at >= BREAK_MS) {
    use.minutes = 0

    return
  }

  use.minutes += 1

  if (use.minutes >= WORK_MINUTES) {
    use.minutes = 0
    $.ui.toast((await strings($)).stand, { timeoutMs: 20000 })
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
