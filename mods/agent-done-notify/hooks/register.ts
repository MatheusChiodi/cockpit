import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const MIN_SECONDS = 30

const took = (seconds: number): string =>
  seconds >= 60 ? `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s` : `${seconds}s`

export const register: Register = on => {
  on('turn.complete', async ($, e, next) => {
    const seconds = Math.round(e.durationMs / 1000)

    // Only a subagent's run, long enough that the person looked elsewhere; never an interrupted one.
    if (e.agentId !== undefined && !e.isAborted && seconds >= MIN_SECONDS) {
      const s = await strings($)
      await $.ui.notify(s.done(e.agentId, took(seconds)), { title: s.title }).catch(() => undefined)
    }

    return next(e)
  })
}
