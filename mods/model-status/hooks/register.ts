import type { EngineInterface, Register } from 'claude-code'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('model-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

const refresh = async ($: EngineInterface): Promise<void> => {
  void show($, `modelo ${(await $.session.model()).replace(/^claude-/, '')}`)
}

export const register: Register = on => {
  on('state.set', { plugin: 'turbina', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.start', async ($, e, next) => {
    await refresh($)

    return next(e)
  })

  // Pega a troca feita com /model no meio da sessão.
  on('turn.complete', async ($, e, next) => {
    await refresh($)

    return next(e)
  })
}
