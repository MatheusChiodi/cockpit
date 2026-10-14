import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('reset-countdown')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// The tightest window, as the last API response reported it.
const tightest: { kind: string; percent: number; resetsAt: number } = { kind: '', percent: 0, resetsAt: 0 }

const tick = async ($: EngineInterface): Promise<void> => {
  const minutes = Math.ceil((tightest.resetsAt - (await $.clock.now())) / 60000)

  if (tightest.kind === '' || minutes <= 0) {
    void show($, undefined)

    return
  }

  const left =
    minutes >= 1440
      ? `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`
      : minutes >= 60
        ? `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`
        : `${minutes}min`

  const s = await strings($)

  void show($, `${s.limit} ${s.kind(tightest.kind)} ${Math.round(tightest.percent)}% · ${s.resets} ${left}`)
}

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.start', ($, e, next) => {
    $.clock.every(60000, () => void tick($))

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    const worst = [...e.rateLimits]
      .filter(limit => limit.resetsAt !== undefined)
      .sort((a, b) => b.percentUsed - a.percentUsed)[0]

    if (worst?.resetsAt !== undefined) {
      tightest.kind = worst.kind
      tightest.percent = worst.percentUsed
      tightest.resetsAt = Date.parse(worst.resetsAt)
      await tick($)
    }

    return next(e)
  })
}
