import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const firstLine = (reason: string): string => {
  const line = (reason.split('\n').find(one => one.trim() !== '') ?? '').trim()

  return line.length > 90 ? `${line.slice(0, 89)}…` : line
}

export const register: Register = on => {
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny !== undefined) {
      const s = await strings($)
      $.ui.toast(s.denied(String(e.tool), firstLine(ran.deny) || s.noReason), { timeoutMs: 6000 })
    }

    return ran
  })
}
