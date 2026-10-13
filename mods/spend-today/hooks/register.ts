import type { EngineInterface, Register } from 'claude-code'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('spend-today')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

type Ledger = Record<string, number>

const dayOf = (ms: number): string => {
  const date = new Date(ms)

  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

// Um registro por dia, com o custo de cada sessão: somar dá o gasto do dia em todas as sessões.
const record = async ($: EngineInterface, usd: number): Promise<void> => {
  const key = `day:${dayOf(await $.clock.now())}`
  const held = await $.store.get(key)
  const ledger: Ledger = typeof held === 'object' && held !== null ? { ...(held as Ledger) } : {}
  ledger[await $.session.id()] = usd
  await $.store.set(key, ledger)

  const total = Object.values(ledger).reduce((sum, value) => sum + value, 0)
  const sessions = Object.keys(ledger).length

  void show($, `hoje US$ ${total.toFixed(2)} em ${sessions} sess${sessions === 1 ? 'ão' : 'ões'}`)
}

export const register: Register = on => {
  on('state.set', { plugin: 'turbina', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.measure', async ($, e, next) => {
    if (e.cost !== undefined) {
      await record($, e.cost.usd)
    }

    return next(e)
  })
}
