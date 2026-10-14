import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('staged-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const refresh = async ($: EngineInterface): Promise<void> => {
  const ran = await $.process
    .run(['git', '--no-pager', 'status', '--porcelain=v1', '-uall'], { timeoutMs: 8000 })
    .catch(() => undefined)

  if (ran === undefined || ran.exitCode !== 0) {
    void show($, undefined)

    return
  }

  const rows = ran.stdout.split('\n').filter(line => line.length > 3)
  const staged = rows.filter(row => row[0] !== ' ' && row[0] !== '?').length
  const unstaged = rows.filter(row => row[1] !== ' ' && row[0] !== '?').length
  const untracked = rows.filter(row => row.startsWith('??')).length
  const s = await strings($)
  const parts = [
    staged > 0 ? `${staged} ${s.staged}` : '',
    unstaged > 0 ? `${unstaged} ${s.unstaged}` : '',
    untracked > 0 ? `${untracked} ${s.untracked}` : '',
  ].filter(part => part !== '')

  // A clean tree has nothing to say.
  void show($, parts.length === 0 ? undefined : `${s.label} ${parts.join('  ')}`)
}

export const register: Register = on => {
  // A status line entry is not redrawn by a state change: clear it when the hub's switch moves.
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.start', async ($, e, next) => {
    await refresh($)
    $.clock.every(30000, () => void refresh($))

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await refresh($)

    return next(e)
  })
}
