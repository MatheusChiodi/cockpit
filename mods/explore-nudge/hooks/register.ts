import type { Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const EXPLORING = new Set(['Read', 'Grep', 'Glob'])
const LIMIT = 15

export const register: Register = on => {
  let count = 0

  on('turn.start', (_$, e, next) => {
    count = 0

    return next(e)
  })

  // Fifteen reads and searches in one turn is exploring: its raw output is cheaper kept in a subagent.
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)

    if (e.agentId !== undefined || !EXPLORING.has(String(e.tool)) || ran.deny !== undefined) {
      return ran
    }

    count += 1

    if (count !== LIMIT || ran.isError === true) {
      return ran
    }

    const s = STRINGS[(await $.state.get(LANG)).value ?? 'en']
    $.ui.toast(s.nudge(LIMIT), { timeoutMs: 6000 })

    return {
      ...ran,
      context: [
        ...(ran.context ?? []),
        `explore-nudge: ${LIMIT} reads and searches so far this turn. If the question is still open-ended, delegate the rest of the exploring to an Explore subagent: its raw output stays out of this context and only the findings come back.`,
      ],
    }
  })
}
