import type { EngineInterface, Register, Timer } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('turn-progress')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const turn: { ticker: Timer | undefined; startedAt: number; tools: number } = {
  ticker: undefined,
  startedAt: 0,
  tools: 0,
}

const tick = async ($: EngineInterface): Promise<void> => {
  const seconds = Math.max(0, Math.round(((await $.clock.now()) - turn.startedAt) / 1000))
  const clock = seconds >= 60 ? `${Math.floor(seconds / 60)}m${String(seconds % 60).padStart(2, '0')}s` : `${seconds}s`

  const s = await strings($)

  void show($, `${s.label} ${clock} · ${s.tools(turn.tools)}`)
}

const stop = ($: EngineInterface): void => {
  turn.ticker?.cancel()
  turn.ticker = undefined
  void show($, undefined)
}

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('turn.start', async ($, e, next) => {
    stop($)
    turn.startedAt = await $.clock.now()
    turn.tools = 0
    turn.ticker = $.clock.every(1000, () => void tick($))

    return next(e)
  })

  on('tool.call', ($, e, next) => {
    if (e.agentId === undefined) {
      turn.tools += 1
    }

    return next(e)
  })

  on('turn.complete', ($, e, next) => {
    if (e.agentId === undefined) {
      stop($)
    }

    return next(e)
  })
}
