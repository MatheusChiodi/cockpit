import type { EngineInterface, Register, Timer } from 'claude-code'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('turn-progress')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

const turn: { ticker: Timer | undefined; startedAt: number; tools: number } = {
  ticker: undefined,
  startedAt: 0,
  tools: 0,
}

const tick = async ($: EngineInterface): Promise<void> => {
  const seconds = Math.max(0, Math.round(((await $.clock.now()) - turn.startedAt) / 1000))
  const clock = seconds >= 60 ? `${Math.floor(seconds / 60)}m${String(seconds % 60).padStart(2, '0')}s` : `${seconds}s`

  void show($, `⏳ ${clock} · ${turn.tools} tool${turn.tools === 1 ? '' : 's'}`)
}

const stop = ($: EngineInterface): void => {
  turn.ticker?.cancel()
  turn.ticker = undefined
  void show($, undefined)
}

export const register: Register = on => {
  on('state.set', { plugin: 'turbina', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('turn.start', async ($, e, next) => {
    stop($)
    turn.startedAt = await $.clock.now()
    turn.tools = 0
    turn.ticker = $.clock.every(1000, () => void tick($))

    return next(e)
  })

  on('tool.call', ($, e, next) => {
    if (e.agentId === undefined) {
      turn.tools += 1
    }

    return next(e)
  })

  on('turn.complete', ($, e, next) => {
    if (e.agentId === undefined) {
      stop($)
    }

    return next(e)
  })
}
