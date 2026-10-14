import type { Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const CAP = 100

export const register: Register = on => {
  // A Grep that prints lines with no head_limit can return hundreds of them: cap it and say so.
  on('tool.call', { tool: 'Grep' }, async ($, e, next) => {
    if (e.output_mode !== 'content' || e.head_limit !== undefined) {
      return next(e)
    }

    const ran = await next({ ...e, head_limit: CAP })

    if (ran.deny !== undefined || ran.isError === true) {
      return ran
    }

    const lines = ran.result.numLines ?? 0

    if (lines < CAP) {
      return ran
    }

    const s = STRINGS[(await $.state.get(LANG)).value ?? 'en']
    $.ui.toast(s.capped(CAP), { timeoutMs: 5000 })

    return {
      ...ran,
      context: [
        ...(ran.context ?? []),
        `grep-limit capped this Grep at ${CAP} lines and the output may be cut. Narrow the pattern, path or glob, or pass head_limit (0 for all) if you really need more.`,
      ],
    }
  }).catch(($, e, next) => next(e))
}
