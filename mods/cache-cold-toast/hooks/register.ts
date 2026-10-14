import type { Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

// The prompt cache lives 5 minutes after its last use.
const TTL_MS = 5 * 60_000
// Below this the re-read is too small to be worth a toast.
const MIN_TOKENS = 20_000

export const register: Register = on => {
  let endedAt = 0
  let tokens = 0

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      endedAt = await $.clock.now()
    }

    return next(e)
  })

  on('session.measure', (_$, e, next) => {
    if (e.context.percent !== undefined) {
      tokens = Math.round((e.context.window * e.context.percent) / 100)
    }

    return next(e)
  })

  // The first prompt after a pause finds the cache cold: the whole context is read again at full price.
  on('prompt.submit', async ($, e, next) => {
    if (endedAt > 0 && e.origin.kind === 'composer' && !e.text.startsWith('/') && tokens >= MIN_TOKENS) {
      const idle = (await $.clock.now()) - endedAt

      if (idle >= TTL_MS) {
        const s = STRINGS[(await $.state.get(LANG)).value ?? 'en']
        const rounded = Math.round(tokens / 1000) * 1000
        $.ui.toast(s.cold(Math.floor(idle / 60_000), rounded.toLocaleString(s.locale)), { timeoutMs: 8000 })
      }
    }

    return next(e)
  })
}
