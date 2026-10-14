import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const elapsed = (ms: number): string => {
  const minutes = Math.max(0, Math.floor(ms / 60000))
  const hours = Math.floor(minutes / 60)

  return hours > 0 ? `${hours}h${String(minutes % 60).padStart(2, '0')}` : `${minutes}min`
}

const tick = async ($: EngineInterface): Promise<void> => {
  const [{ startedAt }, now, turns, s] = await Promise.all([
    $.session.usage(),
    $.clock.now(),
    $.session.turns(),
    strings($),
  ])

  $.ui.status(s.status(elapsed(now - startedAt), turns))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await tick($)
    // The timer dies by itself on a module reload.
    $.clock.every(30000, () => void tick($))

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await tick($)

    return next(e)
  })
}
