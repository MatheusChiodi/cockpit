import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('idle-clock')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const MIN_MINUTES = 2

// When the last turn ended; 0 while a turn runs.
const idle = { since: 0 }

const tick = async ($: EngineInterface): Promise<void> => {
  const minutes = idle.since === 0 ? 0 : Math.floor(((await $.clock.now()) - idle.since) / 60000)

  const s = await strings($)
  const elapsed =
    minutes >= 60 ? `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}` : `${minutes}min`

  void show($, minutes < MIN_MINUTES ? undefined : `${s.label} ${elapsed}`)
}

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.start', ($, e, next) => {
    $.clock.every(30000, () => void tick($))

    return next(e)
  })

  on('turn.start', ($, e, next) => {
    idle.since = 0
    void tick($)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      idle.since = await $.clock.now()
    }

    return next(e)
  })
}
