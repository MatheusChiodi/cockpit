import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

const HOUR_MS = 60 * 60000
const FIRST_MS = 3 * HOUR_MS
const REPEAT_MS = HOUR_MS
const TICK_MS = 60000
// Idle for this long ends a run of continuous use.
const GAP_MS = 30 * 60000

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Module state: a reload drops it along with the old environment.
const run = { at: Number.NEGATIVE_INFINITY, since: 0, next: FIRST_MS }

const touch = async ($: EngineInterface): Promise<void> => {
  const now = await $.clock.now()

  if (now - run.at >= GAP_MS) {
    run.since = now
    run.next = FIRST_MS
  }

  run.at = now
}

const tick = async ($: EngineInterface): Promise<void> => {
  const now = await $.clock.now()

  if (now - run.at >= GAP_MS || now - run.since < run.next) {
    return
  }

  const hours = Math.floor((now - run.since) / HOUR_MS)
  run.next += REPEAT_MS
  $.ui.toast((await strings($)).long(hours), { timeoutMs: 20000 })
}

export const register: Register = on => {
  on('session.start', ($, e, next) => {
    run.next = FIRST_MS

    if (e.isInteractive) {
      $.clock.every(TICK_MS, () => void tick($))
    }

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    await touch($)

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    await touch($)

    return next(e)
  })
}
