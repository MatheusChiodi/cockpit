import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

type Intent = { text: string; at: number }

const INTERVAL_MINUTES = 30
const TICK_MS = 60000
// A prompt or a tool call within this window means the session is in use.
const ACTIVE_MS = 10 * 60000
// An intent older than this belongs to another day's work and is not taken up again.
const STALE_MS = 12 * 60 * 60000

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// One intent per project: the store key is the session's root.
const keyOf = async ($: EngineInterface): Promise<string> => `intent:${await $.session.root()}`

// Module state: a reload drops it along with the old environment.
const use: { at: number; minutes: number; text: string | undefined } = {
  at: Number.NEGATIVE_INFINITY,
  minutes: 0,
  text: undefined,
}

const tick = async ($: EngineInterface): Promise<void> => {
  if (use.text === undefined || (await $.clock.now()) - use.at > ACTIVE_MS) {
    return
  }

  use.minutes += 1

  if (use.minutes >= INTERVAL_MINUTES) {
    use.minutes = 0
    $.ui.toast((await strings($)).ask(use.text), { timeoutMs: 15000 })
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'intent', description: s.command, argumentHint: s.hint })
    const held = await $.store.get(await keyOf($))
    const intent = typeof held === 'object' && held !== null ? (held as Intent) : undefined

    use.minutes = 0
    use.text = intent !== undefined && (await $.clock.now()) - intent.at < STALE_MS ? intent.text : undefined

    if (e.isInteractive) {
      $.clock.every(TICK_MS, () => void tick($))
    }

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    use.at = await $.clock.now()

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    use.at = await $.clock.now()

    return next(e)
  })

  on('command.run', { command: 'intent' }, async ($, e) => {
    const s = await strings($)
    const text = e.args.trim()

    if (text === '') {
      return { text: use.text === undefined ? s.none : s.current(use.text) }
    }

    if (text.toLowerCase() === 'clear') {
      use.text = undefined
      await $.store.delete(await keyOf($))

      return { text: s.cleared }
    }

    use.text = text
    use.minutes = 0
    await $.store.set(await keyOf($), { text, at: await $.clock.now() })

    return { text: s.set(text) }
  })
}
