import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const MILESTONES = [10, 25, 50, 100]
const TOAST_MS = 6000

const session = { prompts: 0 }

export const register: Register = on => {
  on('session.start', (_, e, next) => {
    session.prompts = 0

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    const entered = await next(e)

    // The person's own prompts only, not a plugin's or a background task's.
    if (e.origin.kind === 'composer' || e.origin.kind === 'bridge') {
      session.prompts += 1

      if (MILESTONES.includes(session.prompts)) {
        const s = await strings($)
        $.ui.toast(s.reached(session.prompts), { timeoutMs: TOAST_MS })
      }
    }

    return entered
  })
}
