import type { EngineInterface, Register } from 'claude-code'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('day-timer')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

const ACTIVE_WINDOW_MS = 5 * 60000

const activity = { lastAt: 0 }

const dayOf = (ms: number): string => {
  const date = new Date(ms)

  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

const display = async ($: EngineInterface, minutes: number): Promise<void> => {
  void show($, `hoje: ${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')} de Claude Code`)
}

// A cada minuto com atividade recente (prompt ou tool), soma um minuto ao dia, entre sessões.
const tick = async ($: EngineInterface): Promise<void> => {
  const now = await $.clock.now()
  const key = `minutes:${dayOf(now)}`
  const held = Number((await $.store.get(key)) ?? 0)
  const minutes = now - activity.lastAt <= ACTIVE_WINDOW_MS ? held + 1 : held

  if (minutes !== held) {
    await $.store.set(key, minutes)
  }

  await display($, minutes)
}

export const register: Register = on => {
  on('state.set', { plugin: 'turbina', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.start', async ($, e, next) => {
    await display($, Number((await $.store.get(`minutes:${dayOf(await $.clock.now())}`)) ?? 0))
    $.clock.every(60000, () => void tick($))

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    activity.lastAt = await $.clock.now()

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    activity.lastAt = await $.clock.now()

    return next(e)
  })
}
