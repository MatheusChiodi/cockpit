import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Smaller runs are not worth a toast.
const MIN_TOKENS = 10000

const short = (tokens: number): string => (tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens))

export const register: Register = on => {
  // A subagent's run is one turn: its usage is what the delegated work spent.
  on('turn.complete', async ($, e, next) => {
    const usage = e.usage

    if (e.agentId !== undefined && usage !== undefined && !e.isAborted) {
      const total = usage.input_tokens + usage.output_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens

      if (total >= MIN_TOKENS) {
        const known = (await $.agent.list().catch(() => [])).find(agent => agent.id === e.agentId)
        const s = await strings($)
        $.ui.toast(s.done((known?.description ?? e.agentId).slice(0, 40), short(total), short(usage.output_tokens), usage.model), {
          timeoutMs: 8000,
        })
      }
    }

    return next(e)
  })
}
