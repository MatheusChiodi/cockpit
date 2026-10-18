import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Model families from the cheapest to the dearest; a model of no known family is never judged.
const FAMILIES = ['haiku', 'sonnet', 'opus', 'fable'] as const

const tierOf = (model: string): number => FAMILIES.findIndex(family => model.toLowerCase().includes(family))

// Module state: a reload drops it along with the old environment.
const seen: { model: string | undefined } = { model: undefined }

export const register: Register = on => {
  // Only the main loop: a subagent on another model is agent-model-note's business.
  on('turn.complete', async ($, e, next) => {
    const model = e.usage?.model

    if (e.agentId === undefined && model !== undefined && model !== seen.model) {
      const before = seen.model
      seen.model = model

      if (before !== undefined && tierOf(before) >= 0 && tierOf(model) > tierOf(before)) {
        $.ui.toast((await strings($)).toast(before, model), { timeoutMs: 10000 })
      }
    }

    return next(e)
  })
}
