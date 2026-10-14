import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const QUESTION_TOOL = 'AskUserQuestion'

// One notification per call: a verdict can be asked for again.
const told = new Set<string>()

export const register: Register = on => {
  on('tool.call', { tool: QUESTION_TOOL }, async ($, e, next) => {
    if ((e as { agentId?: string }).agentId === undefined && !told.has(e.tool_use_id)) {
      told.add(e.tool_use_id)
      const s = await strings($)
      await $.ui.notify(s.question, { title: s.title }).catch(() => undefined)
    }

    return next(e)
  })

  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)

    if (
      verdict.decision === 'ask' &&
      e.tool !== QUESTION_TOOL &&
      e.agentId === undefined &&
      e.tool_use_id !== undefined &&
      !told.has(e.tool_use_id)
    ) {
      told.add(e.tool_use_id)
      const s = await strings($)
      await $.ui.notify(s.permission(e.tool), { title: s.title }).catch(() => undefined)
    }

    return verdict
  })
}
