import type { EngineInterface, Register } from 'claude-code'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('dolar-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

type Quote = { USDBRL?: { bid?: string; pctChange?: string } }

// Cotação comercial pela AwesomeAPI (pública, sem chave). Sem rede, não mostra nada.
const refresh = async ($: EngineInterface): Promise<void> => {
  const answer = await $.http.fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL').catch(() => undefined)

  if (answer === undefined || !answer.ok) {
    return
  }

  let quote: Quote = {}

  try {
    quote = JSON.parse(answer.text) as Quote
  } catch {
    return
  }

  const bid = Number(quote.USDBRL?.bid)
  const change = Number(quote.USDBRL?.pctChange)

  if (!Number.isFinite(bid)) {
    return
  }

  const trend = !Number.isFinite(change) || change === 0 ? '' : ` ${change > 0 ? '▲' : '▼'}${Math.abs(change).toFixed(2).replace('.', ',')}%`

  void show($, `US$ 1 = R$ ${bid.toFixed(2).replace('.', ',')}${trend}`)
}

export const register: Register = on => {
  on('state.set', { plugin: 'turbina', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.start', ($, e, next) => {
    void refresh($)
    $.clock.every(15 * 60000, () => void refresh($))

    return next(e)
  })
}
