import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('cost-per-hour')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const HOUR_MS = 60 * 60000
// A rate over the first minutes of a session is noise.
const MIN_MS = 5 * 60000

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  // The session's cost divided by the time since it began.
  on('session.measure', async ($, e, next) => {
    if (e.cost !== undefined && e.cost.usd > 0) {
      const { startedAt } = await $.session.usage()
      const elapsed = (await $.clock.now()) - startedAt

      if (elapsed >= MIN_MS) {
        void show($, `${(await strings($)).rate} US$ ${((e.cost.usd * HOUR_MS) / elapsed).toFixed(2)}/h`)
      }
    }

    return next(e)
  })
}
