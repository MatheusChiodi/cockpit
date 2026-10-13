import type { EngineInterface, Register } from 'claude-code'

type Streak = { day: string; count: number; best: number }

const DAY_MS = 86400000

// Dia local como AAAA-MM-DD, para a sequência virar à meia-noite do usuário.
const dayOf = (ms: number): string => {
  const date = new Date(ms)

  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

const held = async ($: EngineInterface): Promise<Streak | undefined> => {
  const value = await $.store.get('streak')

  return typeof value === 'object' && value !== null ? (value as Streak) : undefined
}

const line = (streak: Streak): string =>
  `🔥 ${streak.count} dia${streak.count === 1 ? '' : 's'} seguido${streak.count === 1 ? '' : 's'} de Claude Code (recorde: ${streak.best})`

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'streak', description: 'Mostra sua sequência de dias usando o Claude Code' })

    const now = await $.clock.now()
    const today = dayOf(now)
    const before = await held($)

    if (before?.day !== today) {
      const count = before?.day === dayOf(now - DAY_MS) ? before.count + 1 : 1
      const streak: Streak = { day: today, count, best: Math.max(count, before?.best ?? 0) }
      await $.store.set('streak', streak)

      if (e.isInteractive) {
        $.ui.toast(line(streak), { timeoutMs: 8000 })
      }
    }

    return next(e)
  })

  on('command.run', { command: 'streak' }, async $ => {
    const streak = await held($)

    return { text: streak === undefined ? 'Sequência ainda não iniciada.' : line(streak) }
  })
}
