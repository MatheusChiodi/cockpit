import type { EngineInterface, Register, SessionRateLimit } from 'claude-code'

import { STRINGS } from './strings'

type Strings = (typeof STRINGS)['en']

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const STEPS = [95, 90, 75] as const

const label = (s: Strings, kind: string): string => s.windows[kind] ?? kind

const resets = (s: Strings, limit: SessionRateLimit): string =>
  limit.resetsAt === undefined
    ? ''
    : s.resets(new Date(limit.resetsAt).toLocaleString(s.locale, { dateStyle: 'short', timeStyle: 'short' }))

export const register: Register = on => {
  const warned = new Map<string, number>()

  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'limits', description: s.command })

    return next(e)
  })

  on('command.run', { command: 'limits' }, async $ => {
    const s = await strings($)
    const { rateLimits } = await $.session.usage()

    return {
      text:
        rateLimits.length === 0
          ? s.none
          : rateLimits.map(limit => `${label(s, limit.kind)}: ${limit.percentUsed}%${resets(s, limit)}`).join('\n'),
    }
  })

  on('session.measure', async ($, e, next) => {
    const s = await strings($)

    for (const limit of e.rateLimits) {
      const step = STEPS.find(threshold => limit.percentUsed >= threshold) ?? 0

      if (step > (warned.get(limit.kind) ?? 0)) {
        $.ui.toast(s.toast(label(s, limit.kind), limit.percentUsed, resets(s, limit)), {
          timeoutMs: 10000,
        })
      }

      warned.set(limit.kind, step)
    }

    return next(e)
  })
}
