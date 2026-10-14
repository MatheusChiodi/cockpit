import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const WARN_AT = 0.8

// The session's budget and what the person was already told about it.
const budget: { limit: number | undefined; isWarned: boolean; isOver: boolean } = {
  limit: undefined,
  isWarned: false,
  isOver: false,
}

const usd = (value: number): string => value.toFixed(2)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'budget', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'budget' }, async ($, e) => {
    const s = await strings($)
    const arg = e.args.trim().replace(',', '.').replace(/^\$/, '')

    if (arg === '') {
      return { text: budget.limit === undefined ? s.none : s.current(usd(budget.limit)) }
    }

    if (arg === 'off') {
      budget.limit = undefined

      return { text: s.off }
    }

    const value = Number(arg)

    if (!Number.isFinite(value) || value <= 0) {
      return { text: s.usage }
    }

    budget.limit = value
    budget.isWarned = false
    budget.isOver = false

    return { text: s.set(usd(value)) }
  })

  on('session.measure', async ($, e, next) => {
    const cost = e.cost?.usd

    if (budget.limit !== undefined && cost !== undefined) {
      const s = await strings($)

      if (cost >= budget.limit && !budget.isOver) {
        budget.isOver = true
        budget.isWarned = true
        await $.ui.notify(s.over(usd(cost), usd(budget.limit)), { title: s.title }).catch(() => undefined)
      } else if (cost >= budget.limit * WARN_AT && !budget.isWarned) {
        budget.isWarned = true
        $.ui.toast(s.warn(usd(cost), usd(budget.limit)), { timeoutMs: 8000 })
      }
    }

    return next(e)
  })
}
