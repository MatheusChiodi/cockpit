import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

type Day = { prompts: number; turns: number; edits: number; isTold: boolean }

const DEFAULT_TIME = '18:00'
const TICK_MS = 60000
// The summary is for the end of the day: two hours past the set time it is no longer said.
const WINDOW_MINUTES = 120
const TOAST_MS = 20000
const HOUR_KEY = 'dayend:time'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Module state: what this session did since it last wrote to the store. The day's record is shared by sessions, so only the delta is kept here.
const pending: { prompts: number; turns: number; edits: number } = { prompts: 0, turns: 0, edits: 0 }

const dayKey = (at: number): string => {
  const date = new Date(at)

  return `day:${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// "18:00" to minutes since midnight, or undefined when it is not a time.
const minutesOf = (time: string): number | undefined => {
  const match = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/.exec(time)

  return match === null ? undefined : Number(match[1]) * 60 + Number(match[2])
}

const timeOf = async ($: EngineInterface): Promise<string | undefined> => {
  const held = await $.store.get(HOUR_KEY)

  if (held === 'off') {
    return undefined
  }

  return typeof held === 'string' && minutesOf(held) !== undefined ? held : DEFAULT_TIME
}

// Adds what this session did to the day's record and returns the record.
const flush = async ($: EngineInterface): Promise<{ key: string; day: Day }> => {
  const key = dayKey(await $.clock.now())
  const held = await $.store.get(key)
  const old = typeof held === 'object' && held !== null ? (held as Partial<Day>) : {}
  const day: Day = {
    prompts: (old.prompts ?? 0) + pending.prompts,
    turns: (old.turns ?? 0) + pending.turns,
    edits: (old.edits ?? 0) + pending.edits,
    isTold: old.isTold === true,
  }
  pending.prompts = 0
  pending.turns = 0
  pending.edits = 0

  if (day.prompts + day.turns + day.edits > 0 || old.isTold !== undefined) {
    await $.store.set(key, day)
  }

  return { key, day }
}

const tick = async ($: EngineInterface): Promise<void> => {
  const time = await timeOf($)
  const target = time === undefined ? undefined : minutesOf(time)

  if (target === undefined) {
    return
  }

  const now = new Date(await $.clock.now())
  const minutes = now.getHours() * 60 + now.getMinutes()

  if (minutes < target || minutes >= target + WINDOW_MINUTES) {
    return
  }

  const { key, day } = await flush($)

  // Said once per day, and only when the day had work in it.
  if (!day.isTold && day.prompts > 0) {
    await $.store.set(key, { ...day, isTold: true })
    $.ui.toast((await strings($)).summary(day.prompts, day.turns, day.edits), { timeoutMs: TOAST_MS })
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'dayend', description: s.command, argumentHint: s.hint })
    pending.prompts = 0
    pending.turns = 0
    pending.edits = 0

    if (e.isInteractive) {
      $.clock.every(TICK_MS, () => void tick($))
    }

    return next(e)
  })

  on('prompt.submit', (_$, e, next) => {
    pending.prompts += 1

    return next(e)
  })

  on('tool.call', { tool: 'Edit' }, async (_$, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true && (e as { agentId?: string }).agentId === undefined) {
      pending.edits += 1
    }

    return ran
  })

  on('tool.call', { tool: 'Write' }, async (_$, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true && (e as { agentId?: string }).agentId === undefined) {
      pending.edits += 1
    }

    return ran
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined && !e.isAborted) {
      pending.turns += 1
      await flush($)
    }

    return next(e)
  })

  on('command.run', { command: 'dayend' }, async ($, e) => {
    const s = await strings($)
    const arg = e.args.trim().toLowerCase()

    if (arg === '') {
      const time = await timeOf($)

      return { text: time === undefined ? s.disabled : s.current(time) }
    }

    if (arg === 'off') {
      await $.store.set(HOUR_KEY, 'off')

      return { text: s.off }
    }

    if (minutesOf(arg) === undefined) {
      return { text: s.usage }
    }

    const time = arg.padStart(5, '0')
    await $.store.set(HOUR_KEY, time)

    return { text: s.set(time) }
  })
}
