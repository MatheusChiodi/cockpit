import type { EngineInterface, Register, Timer } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const DEFAULT_MINUTES = 25

// Module state: a reload cancels the timer along with the old environment.
const running: { ticker: Timer | undefined; endsAt: number } = { ticker: undefined, endsAt: 0 }

const stop = ($: EngineInterface): void => {
  running.ticker?.cancel()
  running.ticker = undefined
  $.ui.status(undefined)
}

const tick = async ($: EngineInterface): Promise<void> => {
  const left = running.endsAt - (await $.clock.now())
  const s = await strings($)

  if (left > 0) {
    $.ui.status(s.focus(Math.ceil(left / 60000)))

    return
  }

  stop($)
  $.ui.toast(s.done, { timeoutMs: 15000 })
  await $.ui.notify(s.done, { title: s.title }).catch(() => undefined)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'pomodoro', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'pomodoro' }, async ($, e) => {
    const s = await strings($)
    const wanted = e.args.trim().toLowerCase()

    if (wanted === 'stop') {
      stop($)

      return { text: s.cancelled }
    }

    const minutes = wanted === '' ? DEFAULT_MINUTES : Number(wanted)

    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 240) {
      return { text: s.usage }
    }

    stop($)
    running.endsAt = (await $.clock.now()) + minutes * 60000
    running.ticker = $.clock.every(15000, () => void tick($))
    await tick($)

    return { text: s.started(minutes) }
  })
}
