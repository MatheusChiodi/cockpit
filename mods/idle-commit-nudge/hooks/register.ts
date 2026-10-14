import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const IDLE_MS = 10 * 60000
const CHECK_MS = 60000
const TOAST_MS = 10000

// The last moment the session did anything, and whether this idle stretch was already handled.
const activity: { at: number; isNudged: boolean } = { at: 0, isNudged: false }

const touch = async ($: EngineInterface): Promise<void> => {
  activity.at = await $.clock.now()
  activity.isNudged = false
}

const check = async ($: EngineInterface): Promise<void> => {
  if (activity.isNudged || (await $.clock.now()) - activity.at < IDLE_MS) {
    return
  }

  // One look per idle stretch, whether or not there is anything to commit.
  activity.isNudged = true
  const ran = await $.process.run(['git', 'status', '--porcelain'], { timeoutMs: 10000 }).catch(() => undefined)
  const files = ran !== undefined && ran.exitCode === 0 ? ran.stdout.split('\n').filter(line => line.trim() !== '').length : 0

  if (files > 0) {
    const s = await strings($)
    $.ui.toast(s.idle(files), { timeoutMs: TOAST_MS })
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await touch($)
    $.clock.every(CHECK_MS, () => void check($))

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    await touch($)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await touch($)

    return next(e)
  })
}
