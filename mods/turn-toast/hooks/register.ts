import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const MIN_SECONDS = 10
const TOAST_MS = 8000

// Tool calls of the main loop in the turn that is running.
const turn = { tools: 0 }

const took = (seconds: number): string =>
  seconds >= 60 ? `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s` : `${seconds}s`

const count = (tokens: number): string => (tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens))

export const register: Register = on => {
  on('turn.start', (_, e, next) => {
    turn.tools = 0

    return next(e)
  })

  on('tool.call', (_, e, next) => {
    if ((e as { agentId?: string }).agentId === undefined) {
      turn.tools += 1
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const seconds = Math.round(e.durationMs / 1000)

    if (e.agentId === undefined && !e.isAborted && seconds >= MIN_SECONDS) {
      const s = await strings($)
      $.ui.toast(s.summary(took(seconds), turn.tools, count(e.usage?.output_tokens ?? 0)), { timeoutMs: TOAST_MS })
    }

    return next(e)
  })
}
