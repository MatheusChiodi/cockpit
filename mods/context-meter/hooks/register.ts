import type { Register } from 'claude-code'

const STEPS = [90, 80] as const

const bar = (percent: number): string => {
  const filled = Math.round(Math.min(100, percent) / 10)

  return `${'█'.repeat(filled)}${'░'.repeat(10 - filled)}`
}

export const register: Register = on => {
  let warned = 0

  on('session.measure', ($, e, next) => {
    const percent = e.context.percent

    if (percent !== undefined) {
      const cost = e.cost === undefined ? '' : ` · US$ ${e.cost.usd.toFixed(2)}`
      $.ui.status(`ctx ${bar(percent)} ${percent}%${cost}`)

      const step = STEPS.find(limit => percent >= limit)

      if (step !== undefined && step > warned) {
        $.ui.toast(`Contexto em ${percent}%. Considere /compact ou /clear.`, { timeoutMs: 8000 })
      }

      // Depois de um /compact o aviso volta a valer.
      warned = step ?? 0
    }

    return next(e)
  })
}
