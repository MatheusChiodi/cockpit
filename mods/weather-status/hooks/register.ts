import type { EngineInterface, Register } from 'claude-code'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('weather-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// Weather for your location (by IP) from wttr.in, public and keyless. Offline, it shows nothing.
const refresh = async ($: EngineInterface): Promise<void> => {
  const answer = await $.http.fetch('https://wttr.in/?format=%l:+%c+%t').catch(() => undefined)
  const line = answer?.ok === true ? answer.text.replace(/\s+/g, ' ').trim() : ''

  // An HTML error page is not a forecast.
  if (line !== '' && line.length <= 60 && !line.includes('<')) {
    void show($, line.replace('+', ''))
  }
}

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
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
