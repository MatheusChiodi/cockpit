import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const LIMIT = 20_000

// `text` is the result as the model reads it; a hook's own answer has none.
const sizeOf = (ran: { text?: string; result?: unknown }): number =>
  ran.text?.length ?? JSON.stringify(ran.result ?? '').length

export const register: Register = on => {
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    const size = ran.deny === undefined ? sizeOf(ran) : 0

    if (size > LIMIT) {
      const s = await strings($)
      $.ui.toast(s.big(String(e.tool), size.toLocaleString(s.locale)), { timeoutMs: 8000 })
    }

    return ran
  })
}
