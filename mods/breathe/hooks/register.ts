import type { EngineInterface, Register, Timer } from 'claude-code'

import { STRINGS } from './strings'

const ROUNDS = 5
// In for 4 seconds, hold for 4, out for 6.
const PHASES = [
  { phase: 'in', seconds: 4 },
  { phase: 'hold', seconds: 4 },
  { phase: 'out', seconds: 6 },
] as const

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Module state: a reload cancels the timer along with the old environment.
const guide: { timer: Timer | undefined } = { timer: undefined }

// Step `index` counts phases from 0: three per round, one toast each.
const step = async ($: EngineInterface, index: number): Promise<void> => {
  const s = await strings($)

  if (index >= ROUNDS * PHASES.length) {
    guide.timer = undefined
    $.ui.toast(s.done, { timeoutMs: 6000 })

    return
  }

  const current = PHASES[index % PHASES.length] ?? PHASES[0]
  $.ui.toast(s.phase(current.phase, current.seconds, Math.floor(index / PHASES.length) + 1, ROUNDS), {
    timeoutMs: current.seconds * 1000,
  })
  guide.timer = $.clock.after(current.seconds * 1000, () => void step($, index + 1))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'breathe', description: (await strings($)).command })

    return next(e)
  })

  on('command.run', { command: 'breathe' }, async $ => {
    guide.timer?.cancel()
    await step($, 0)

    return { text: (await strings($)).started(ROUNDS) }
  })
}
