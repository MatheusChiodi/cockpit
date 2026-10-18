import type { EngineInterface, Register, Timer } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('slow-call-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const SLOW_MS = 15000

type Running = { tool: string; target: string; startedAt: number }

const calls: { running: Map<string, Running>; ticker: Timer | undefined; shown: string | undefined; next: number } = {
  running: new Map(),
  ticker: undefined,
  shown: undefined,
  next: 0,
}

const targetOf = (input: object): string => {
  const { command, file_path: file, pattern } = input as { command?: unknown; file_path?: unknown; pattern?: unknown }
  const text = [command, file, pattern].find(value => typeof value === 'string')

  return typeof text === 'string' ? text.replace(/\s+/g, ' ').slice(0, 40) : ''
}

const took = (ms: number): string => {
  const seconds = Math.round(ms / 1000)

  return seconds >= 60 ? `${Math.floor(seconds / 60)}m${String(seconds % 60).padStart(2, '0')}s` : `${seconds}s`
}

// Writes the status line only when its text changed, so a quiet tick redraws nothing.
const draw = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  if (text !== calls.shown) {
    calls.shown = text
    await show($, text)
  }
}

const tick = async ($: EngineInterface): Promise<void> => {
  const oldest = [...calls.running.values()].sort((a, b) => a.startedAt - b.startedAt)[0]
  const elapsed = oldest === undefined ? 0 : (await $.clock.now()) - oldest.startedAt

  if (oldest === undefined || elapsed < SLOW_MS) {
    await draw($, undefined)

    return
  }

  const s = await strings($)
  const target = oldest.target === '' ? '' : ` · ${oldest.target}`

  await draw($, `${s.label} ${oldest.tool} ${took(elapsed)}${target}`)
}

const finish = async ($: EngineInterface, id: string): Promise<void> => {
  calls.running.delete(id)

  if (calls.running.size === 0) {
    calls.ticker?.cancel()
    calls.ticker = undefined
    await draw($, undefined)
  }
}

export const register: Register = on => {
  // A status line entry is not redrawn by a state change: clear it when the hub's switch moves.
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    calls.shown = undefined
    await show($, undefined)

    return set
  })

  on('tool.call', async ($, e, next) => {
    calls.next += 1
    const id = e.tool_use_id ?? `call-${calls.next}`
    calls.running.set(id, { tool: String(e.tool), target: targetOf(e), startedAt: await $.clock.now() })
    calls.ticker ??= $.clock.every(1000, () => void tick($))

    try {
      return await next(e)
    } finally {
      await finish($, id)
    }
  })
}
