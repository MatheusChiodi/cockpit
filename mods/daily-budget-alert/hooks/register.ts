import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const LIMIT_KEY = 'daybudget:limit'

// One record per local date: what each session spent, and whether the person was told already.
type Day = { sessions: Record<string, number>; isAlerted: boolean }

const usd = (value: number): string => value.toFixed(2)

const dayKey = async ($: EngineInterface): Promise<string> => {
  const at = new Date(await $.clock.now())
  const pad = (n: number): string => String(n).padStart(2, '0')

  return `daybudget:${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`
}

const loadDay = async ($: EngineInterface, key: string): Promise<Day> => {
  const held = (await $.store.get(key)) as Day | undefined

  return held !== undefined && typeof held.sessions === 'object' ? held : { sessions: {}, isAlerted: false }
}

const loadLimit = async ($: EngineInterface): Promise<number | undefined> => {
  const held = await $.store.get(LIMIT_KEY)

  return typeof held === 'number' && held > 0 ? held : undefined
}

const total = (day: Day): number => Object.values(day.sessions).reduce((sum, value) => sum + value, 0)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'daybudget', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'daybudget' }, async ($, e) => {
    const s = await strings($)
    const arg = e.args.trim().replace(',', '.').replace(/^\$/, '')
    const key = await dayKey($)
    const day = await loadDay($, key)

    if (arg === '') {
      const limit = await loadLimit($)

      return { text: limit === undefined ? s.none : s.current(usd(limit), usd(total(day))) }
    }

    if (arg === 'off') {
      await $.store.delete(LIMIT_KEY)

      return { text: s.off }
    }

    const value = Number(arg)

    if (!Number.isFinite(value) || value <= 0) {
      return { text: s.usage }
    }

    await $.store.set(LIMIT_KEY, value)
    // A new limit is a new chance to be told.
    await $.store.set(key, { ...day, isAlerted: false })

    return { text: s.set(usd(value), usd(total(day))) }
  })

  on('session.measure', async ($, e, next) => {
    const cost = e.cost?.usd

    if (cost !== undefined && e.changed.includes('cost')) {
      const key = await dayKey($)
      const id = await $.session.id()
      const day = await loadDay($, key)
      const sessions = { ...day.sessions, [id]: cost }
      const limit = await loadLimit($)
      const sum = total({ ...day, sessions })
      const isOver = limit !== undefined && sum >= limit && !day.isAlerted

      await $.store.set(key, { sessions, isAlerted: day.isAlerted || isOver })

      if (isOver) {
        const s = await strings($)
        await $.ui.notify(s.over(usd(sum), usd(limit)), { title: s.title }).catch(() => undefined)
      }
    }

    return next(e)
  })
}
