import type { EngineInterface, Register } from 'claude-code'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('cost-ticker')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

export const register: Register = on => {
  on('state.set', { plugin: 'turbina', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  let baseline = 0
  let current = 0

  on('turn.start', ($, e, next) => {
    baseline = current

    return next(e)
  })

  // Quanto custou o turno que acabou e o total da sessão, lado a lado.
  on('session.measure', ($, e, next) => {
    if (e.cost !== undefined) {
      current = e.cost.usd
      void show($, `turno US$ ${Math.max(0, current - baseline).toFixed(2)} · sessão US$ ${current.toFixed(2)}`)
    }

    return next(e)
  })
}
