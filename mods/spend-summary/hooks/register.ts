import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const MINUTE = 60000

// Module state: a reload drops it along with the old environment.
const spent = { usd: 0, turns: 0 }

const span = (ms: number): string => {
  const minutes = Math.max(1, Math.round(ms / MINUTE))

  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m` : `${minutes}m`
}

export const register: Register = on => {
  on('session.measure', (_$, e, next) => {
    if (e.cost !== undefined) {
      spent.usd = e.cost.usd
    }

    return next(e)
  })

  // The main loop's turns only: a subagent's run is part of the turn that spawned it.
  on('turn.complete', (_$, e, next) => {
    if (e.agentId === undefined && !e.isAborted) {
      spent.turns += 1
    }

    return next(e)
  })

  // A /clear ends the conversation but not the process: the summary belongs to the session that ended, so reset after it.
  on('session.end', async ($, e, next) => {
    if (spent.usd > 0 && spent.turns > 0) {
      const s = await strings($)
      const { startedAt } = await $.session.usage().catch(() => ({ startedAt: undefined }))
      const time = span(startedAt === undefined ? 0 : (await $.clock.now()) - startedAt)
      await $.ui
        .notify(s.summary(spent.usd.toFixed(2), spent.turns, time, (spent.usd / spent.turns).toFixed(2)), { title: s.title })
        .catch(() => undefined)
    }

    spent.usd = 0
    spent.turns = 0

    return next(e)
  })
}
