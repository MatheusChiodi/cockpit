import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const THRESHOLD = 90

// Windows already announced: a window that falls back under the threshold (it reset) is armed again.
const announced = new Set<string>()

const when = (iso: string | undefined, locale: string): string => {
  if (iso === undefined) {
    return ''
  }

  const at = new Date(iso)

  return Number.isNaN(at.getTime())
    ? ''
    : at.toLocaleString(locale, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
}

export const register: Register = on => {
  on('session.measure', async ($, e, next) => {
    for (const limit of e.rateLimits) {
      if (limit.percentUsed < THRESHOLD) {
        announced.delete(limit.kind)
      } else if (!announced.has(limit.kind)) {
        announced.add(limit.kind)
        const s = await strings($)
        await $.ui
          .notify(s.warn(limit.kind, Math.round(limit.percentUsed), when(limit.resetsAt, s.locale)), { title: s.title })
          .catch(() => undefined)
      }
    }

    return next(e)
  })
}
