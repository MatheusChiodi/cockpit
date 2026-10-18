import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const MINUTE = 60000
const TICK_MS = 30000
// With fewer than two finished runs there is nothing to compare with: only a very long run counts.
const ALONE_MS = 10 * MINUTE
const FLOOR_MS = 2 * MINUTE
const FACTOR = 3
const ACTIVE = new Set(['pending', 'running', 'waiting'])

type Run = { at: number; what: string; isWarned: boolean }

// Module state: a reload drops it along with the old environment.
const runs = new Map<string, Run>()
const finished: number[] = []

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)

  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

const tick = async ($: EngineInterface): Promise<void> => {
  const now = await $.clock.now()
  const listed = await $.agent.list().catch(() => undefined)

  // An unreadable list says nothing about the runs: keep them for the next tick.
  if (listed === undefined) {
    return
  }

  const alive = new Set(listed.filter(agent => ACTIVE.has(agent.status)).map(agent => agent.id))
  const typical = finished.length >= 2 ? median(finished) : undefined
  const limit = typical === undefined ? ALONE_MS : Math.max(FLOOR_MS, typical * FACTOR)

  for (const [id, run] of runs) {
    if (!alive.has(id)) {
      runs.delete(id)
    } else if (!run.isWarned && now - run.at >= limit) {
      run.isWarned = true
      const s = await strings($)
      const others = typical === undefined ? '' : s.typical(Math.max(1, Math.round(typical / MINUTE)))
      $.ui.toast(s.toast(run.what, Math.round((now - run.at) / MINUTE), others), { timeoutMs: 10000 })
    }
  }
}

export const register: Register = on => {
  on('session.start', ($, e, next) => {
    $.clock.every(TICK_MS, () => void tick($))

    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const spawned = await next(e)

    if (spawned.deny === undefined && spawned.agentId !== undefined && e.isTeammate !== true) {
      runs.set(spawned.agentId, { at: await $.clock.now(), what: e.description.slice(0, 40), isWarned: false })
    }

    return spawned
  })

  on('turn.complete', async ($, e, next) => {
    const run = e.agentId === undefined ? undefined : runs.get(e.agentId)

    if (e.agentId !== undefined && run !== undefined && !e.isAborted) {
      finished.push((await $.clock.now()) - run.at)
      runs.delete(e.agentId)
    }

    return next(e)
  })
}
