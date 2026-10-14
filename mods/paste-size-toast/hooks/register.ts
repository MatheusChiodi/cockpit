import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// About 4 characters to a token; 5,000 tokens of prompt is a paste worth a second look.
const MIN_CHARS = 20_000

export const register: Register = on => {
  on('prompt.submit', async ($, e, next) => {
    if (e.origin.kind === 'composer' && !e.text.startsWith('/') && e.text.length >= MIN_CHARS) {
      const s = await strings($)
      const lines = e.text.split('\n').length
      const tokens = Math.round(e.text.length / 4 / 100) * 100
      $.ui.toast(s.big(lines.toLocaleString(s.locale), tokens.toLocaleString(s.locale)), { timeoutMs: 8000 })
    }

    return next(e)
  })
}
