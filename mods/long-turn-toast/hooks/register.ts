import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// A turn is long when it is at least this many times the median and at least this many ms.
const FACTOR = 3
const MIN_MS = 2 * 60000
// The median needs this many earlier turns to mean anything.
const MIN_HISTORY = 5
const KEEP = 50
const TOAST_MS = 12000

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Module state: durations of the finished turns of this session, main loop only.
const history: { durations: number[] } = { durations: [] }

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 1 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
}

const took = (ms: number): string => {
  const seconds = Math.round(ms / 1000)

  return seconds >= 60 ? `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s` : `${seconds}s`
}

export const register: Register = on => {
  on('session.start', (_$, e, next) => {
    history.durations = []

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined && !e.isAborted) {
      if (history.durations.length >= MIN_HISTORY) {
        const usual = median(history.durations)

        if (e.durationMs >= MIN_MS && e.durationMs >= usual * FACTOR) {
          $.ui.toast((await strings($)).long(took(e.durationMs), took(usual)), { timeoutMs: TOAST_MS })
        }
      }

      history.durations = [...history.durations, e.durationMs].slice(-KEEP)
    }

    return next(e)
  })
}
