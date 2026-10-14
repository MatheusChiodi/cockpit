import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// Local hours: from 23:00 until 05:00 it is late.
const LATE_FROM = 23
const LATE_UNTIL = 5

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Module state: one toast per session.
const told = { isTold: false }

const check = async ($: EngineInterface): Promise<void> => {
  if (told.isTold) {
    return
  }

  const now = new Date(await $.clock.now())

  if (now.getHours() < LATE_FROM && now.getHours() >= LATE_UNTIL) {
    return
  }

  told.isTold = true
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  $.ui.toast((await strings($)).late(time), { timeoutMs: 15000 })
}

export const register: Register = on => {
  on('session.start', (_$, e, next) => {
    told.isTold = false

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    await check($)

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    await check($)

    return next(e)
  })
}
