import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('api-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type StatusPage = { status?: { indicator?: string; description?: string } }

// Public status page (Statuspage format). With no network or no valid answer, it shows nothing.
const refresh = async ($: EngineInterface): Promise<void> => {
  const answer = await $.http.fetch('https://status.anthropic.com/api/v2/status.json').catch(() => undefined)

  if (answer === undefined || !answer.ok) {
    void show($, undefined)

    return
  }

  let page: StatusPage = {}

  try {
    page = JSON.parse(answer.text) as StatusPage
  } catch {
    page = {}
  }

  const indicator = page.status?.indicator
  const s = await strings($)

  void show($, 
    indicator === undefined
      ? undefined
      : indicator === 'none'
        ? `${s.label} ✓`
        : `${s.label} ⚠ ${(page.status?.description ?? indicator).slice(0, 60)}`,
  )
}

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.start', ($, e, next) => {
    void refresh($)
    $.clock.every(5 * 60000, () => void refresh($))

    return next(e)
  })
}
