import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const MIN_SECONDS = 30

export const register: Register = on => {
  on('turn.complete', async ($, e, next) => {
    const seconds = Math.round(e.durationMs / 1000)

    // Only long turns of the main loop: that is when you have already switched windows.
    if (e.agentId === undefined && !e.isAborted && seconds >= MIN_SECONDS) {
      const s = await strings($)
      await $.ui.notify(e.reason === 'error' ? s.failed(seconds) : s.done(seconds), { title: s.title }).catch(() => undefined)
    }

    return next(e)
  })
}
