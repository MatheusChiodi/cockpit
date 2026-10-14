import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const MIN_COMMITS = 3
const CHECK_MS = 10 * 60000
const HOUR_MS = 60 * 60000
const TOAST_MS = 10000

// When the branch first read MIN_COMMITS or more ahead, and when the person was last reminded.
const ahead: { since: number | undefined; toldAt: number | undefined } = { since: undefined, toldAt: undefined }

// A branch with no upstream (or no git) makes the command fail: nothing to remind about.
const check = async ($: EngineInterface): Promise<void> => {
  const ran = await $.process.run(['git', 'rev-list', '--count', '@{u}..HEAD'], { timeoutMs: 10000 }).catch(() => undefined)
  const count = ran !== undefined && ran.exitCode === 0 ? Number.parseInt(ran.stdout.trim(), 10) : 0
  const now = await $.clock.now()

  if (!(count >= MIN_COMMITS)) {
    ahead.since = undefined

    return
  }

  ahead.since ??= now

  if (now - ahead.since >= HOUR_MS && (ahead.toldAt === undefined || now - ahead.toldAt >= HOUR_MS)) {
    ahead.toldAt = now
    const s = await strings($)
    $.ui.toast(s.unpushed(count), { timeoutMs: TOAST_MS })
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    ahead.since = undefined
    ahead.toldAt = undefined
    void check($)
    $.clock.every(CHECK_MS, () => void check($))

    return next(e)
  })
}
