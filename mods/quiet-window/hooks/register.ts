import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

const MAX_MINUTES = 480
const TOAST_MS = 10000

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Module state: when the quiet ends (0 when there is none), how many notices it held, and which window the timer belongs to.
const quiet: { until: number; held: number; window: number } = { until: 0, held: 0, window: 0 }

const clockOf = (at: number): string => {
  const date = new Date(at)

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// The window is closed before the summary is said, so the summary is not held by the window it reports.
const finish = async ($: EngineInterface, window: number): Promise<void> => {
  if (window !== quiet.window || quiet.until === 0) {
    return
  }

  const held = quiet.held
  quiet.until = 0
  quiet.held = 0

  if (held > 0) {
    $.ui.toast((await strings($)).over(held), { timeoutMs: TOAST_MS })
  }
}

const isQuiet = async ($: EngineInterface): Promise<boolean> => quiet.until > 0 && (await $.clock.now()) < quiet.until

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'quiet', description: s.command, argumentHint: s.hint })
    quiet.until = 0
    quiet.held = 0
    quiet.window += 1

    return next(e)
  })

  on('ui.toast', async ($, e, next) => {
    if (await isQuiet($)) {
      quiet.held += 1

      return { value: undefined }
    }

    return next(e)
  })

  on('ui.notify', async ($, e, next) => {
    if (await isQuiet($)) {
      quiet.held += 1

      return { value: { isSent: false, reason: 'refused' } }
    }

    return next(e)
  })

  on('command.run', { command: 'quiet' }, async ($, e) => {
    const s = await strings($)
    const arg = e.args.trim().toLowerCase()
    const now = await $.clock.now()

    if (arg === '') {
      return { text: await isQuiet($) ? s.status(clockOf(quiet.until), quiet.held) : s.none }
    }

    // Sends one toast and one notification through the window, to see that it holds them.
    if (arg === 'test') {
      const before = quiet.held
      $.ui.toast(s.probe, { timeoutMs: TOAST_MS })
      await $.ui.notify(s.probe).catch(() => undefined)

      return { text: quiet.held > before ? s.holding : s.open }
    }

    if (arg === 'off') {
      const held = quiet.held
      quiet.until = 0
      quiet.held = 0
      quiet.window += 1

      return { text: s.off(held) }
    }

    const minutes = /^[0-9]+$/.test(arg) ? Number(arg) : 0

    if (minutes < 1 || minutes > MAX_MINUTES) {
      return { text: s.usage }
    }

    quiet.window += 1
    quiet.until = now + minutes * 60000
    quiet.held = 0
    const window = quiet.window
    $.clock.after(minutes * 60000, () => void finish($, window))

    return { text: s.on(minutes, clockOf(quiet.until)) }
  })
}
