import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('commits-today')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const refresh = async ($: EngineInterface): Promise<void> => {
  const who = await $.process.run(['git', 'config', 'user.email'], { timeoutMs: 5000 }).catch(() => undefined)
  const email = who?.exitCode === 0 ? who.stdout.trim() : ''
  const args = ['log', '--since=midnight', '--oneline', ...(email === '' ? [] : [`--author=${email}`])]
  const ran = await $.process.run(['git', '--no-pager', ...args], { timeoutMs: 5000 }).catch(() => undefined)

  if (ran === undefined || ran.exitCode !== 0) {
    void show($, undefined)

    return
  }

  const count = ran.stdout.split('\n').filter(line => line !== '').length

  const s = await strings($)

  void show($, `${s.label} ${count} ${s.today}`)
}

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.start', async ($, e, next) => {
    await refresh($)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await refresh($)

    return next(e)
  })
}
