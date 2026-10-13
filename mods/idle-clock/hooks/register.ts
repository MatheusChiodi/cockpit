import type { EngineInterface, Register } from 'claude-code'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('idle-clock')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

const MIN_MINUTES = 2

// Quando o último turno terminou; 0 enquanto um turno roda.
const idle = { since: 0 }

const tick = async ($: EngineInterface): Promise<void> => {
  const minutes = idle.since === 0 ? 0 : Math.floor(((await $.clock.now()) - idle.since) / 60000)

  void show($, minutes < MIN_MINUTES ? undefined : `parado há ${minutes >= 60 ? `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}` : `${minutes}min`}`)
}

export const register: Register = on => {
  on('state.set', { plugin: 'turbina', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.start', ($, e, next) => {
    $.clock.every(30000, () => void tick($))

    return next(e)
  })

  on('turn.start', ($, e, next) => {
    idle.since = 0
    void tick($)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      idle.since = await $.clock.now()
    }

    return next(e)
  })
}
