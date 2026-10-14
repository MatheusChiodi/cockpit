import type { Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const JUMP = 10

export const register: Register = on => {
  let previous: number | undefined
  let lastTool: string | undefined

  on('tool.call', (_$, e, next) => {
    if (e.agentId === undefined) {
      lastTool = String(e.tool)
    }

    return next(e)
  })

  // A step that fills a tenth of the window is one big result: say which tool ran last.
  on('session.measure', async ($, e, next) => {
    const now = e.context.percent

    if (now !== undefined && e.changed.includes('context')) {
      if (previous !== undefined && now - previous >= JUMP) {
        const s = STRINGS[(await $.state.get(LANG)).value ?? 'en']
        $.ui.toast(s.jump(Math.round(now - previous), Math.round(now), lastTool ?? s.unknown), { timeoutMs: 7000 })
      }

      previous = now
    }

    return next(e)
  })
}
