import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

export const register: Register = on => {
  on('turn.complete', async ($, e, next) => {
    // Main loop only; an interrupted turn has reason 'aborted' and never gets here.
    if (e.agentId === undefined && (e.reason === 'error' || e.reason === 'refusal')) {
      const s = await strings($)
      await $.ui.notify(e.reason === 'error' ? s.error : s.refusal, { title: s.title }).catch(() => undefined)
    }

    return next(e)
  })
}
