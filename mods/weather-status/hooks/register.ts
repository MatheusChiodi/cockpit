import type { EngineInterface, Register } from 'claude-code'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('weather-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// Clima da sua localização (por IP) pelo wttr.in, público e sem chave. Sem rede, não mostra nada.
const refresh = async ($: EngineInterface): Promise<void> => {
  const answer = await $.http.fetch('https://wttr.in/?format=%l:+%c+%t').catch(() => undefined)
  const line = answer?.ok === true ? answer.text.replace(/\s+/g, ' ').trim() : ''

  // Uma página de erro em HTML não é previsão.
  if (line !== '' && line.length <= 60 && !line.includes('<')) {
    void show($, line.replace('+', ''))
  }
}

export const register: Register = on => {
  on('state.set', { plugin: 'turbina', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.start', ($, e, next) => {
    void refresh($)
    $.clock.every(30 * 60000, () => void refresh($))

    return next(e)
  })
}
