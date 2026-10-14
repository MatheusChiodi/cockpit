import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('dolar-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Quote = { USDBRL?: { bid?: string; pctChange?: string } }

const TWO_DECIMALS = { minimumFractionDigits: 2, maximumFractionDigits: 2 } as const

// Commercial rate from AwesomeAPI (public, no key). Offline, it shows nothing.
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

  const s = await strings($)
  const trend =
    !Number.isFinite(change) || change === 0
      ? ''
      : ` ${change > 0 ? '▲' : '▼'}${Math.abs(change).toLocaleString(s.locale, TWO_DECIMALS)}%`

  void show($, `${s.label} R$ ${bid.toLocaleString(s.locale, TWO_DECIMALS)}${trend}`)
}

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
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
