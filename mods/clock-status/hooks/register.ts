import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('clock-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// In fullscreen mode the system clock disappears: this one stays on the status line.
const tick = async ($: EngineInterface): Promise<void> => {
  const s = await strings($)
  const now = new Date(await $.clock.now())
  const day = now.toLocaleDateString(s.locale, { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '')
  const time = now.toLocaleTimeString(s.locale, { hour: '2-digit', minute: '2-digit' })

  void show($, `${day} · ${time}`)
}

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.start', async ($, e, next) => {
    await tick($)
    $.clock.every(20000, () => void tick($))

    return next(e)
  })
}
