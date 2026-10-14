import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const STEP = 10
const CHECK_MS = 15 * 60000
const TOAST_MS = 10000

// The last multiple of STEP the person was told about; resets when the branch catches up.
const told: { bucket: number } = { bucket: 0 }

const run = ($: EngineInterface, args: readonly string[]) =>
  $.process.run(['git', '--no-pager', ...args], { timeoutMs: 10000 }).catch(() => undefined)

// Reads local refs only (no fetch): the remote-tracking branch is as fresh as the last fetch or pull.
const check = async ($: EngineInterface): Promise<void> => {
  const head = await run($, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])
  const base = head?.exitCode === 0 && head.stdout.trim() !== '' ? head.stdout.trim() : 'origin/main'
  const current = await run($, ['rev-parse', '--abbrev-ref', 'HEAD'])
  const branch = current?.exitCode === 0 ? current.stdout.trim() : ''

  if (branch === '' || branch === 'HEAD' || base === `origin/${branch}`) {
    return
  }

  const counted = await run($, ['rev-list', '--count', `HEAD..${base}`])
  const behind = counted?.exitCode === 0 ? Number.parseInt(counted.stdout.trim(), 10) || 0 : 0
  const bucket = Math.floor(behind / STEP)

  if (bucket > told.bucket) {
    const s = await strings($)
    $.ui.toast(s.behind(behind, base, branch), { timeoutMs: TOAST_MS })
  }

  told.bucket = bucket
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    told.bucket = 0
    void check($)
    $.clock.every(CHECK_MS, () => void check($))

    return next(e)
  })
}
