import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const STEPS = [90, 80] as const

const bar = (percent: number): string => {
  const filled = Math.round(Math.min(100, percent) / 10)

  return `${'━'.repeat(filled)}${'─'.repeat(10 - filled)}`
}

export const register: Register = on => {
  let warned = 0

  on('session.measure', async ($, e, next) => {
    const percent = e.context.percent

    if (percent !== undefined) {
      const s = await strings($)
      const cost = e.cost === undefined ? '' : s.cost(e.cost.usd.toFixed(2))
      $.ui.status(`${s.label} ${bar(percent)} ${percent}%${cost}`)

      const step = STEPS.find(limit => percent >= limit)

      if (step !== undefined && step > warned) {
        $.ui.toast(s.warn(percent), { timeoutMs: 8000 })
      }

      // After a /compact the warning applies again.
      warned = step ?? 0
    }

    return next(e)
  })
}
