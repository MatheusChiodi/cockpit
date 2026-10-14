import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Pr = { number?: number; reviewDecision?: string | null }

const POLL_MS = 180000

// What the last poll saw of the current branch's PR: the first reading is a baseline, never announced.
const seen: { number: number | undefined; decision: string } = { number: undefined, decision: '' }

// Needs the authenticated GitHub CLI (`gh`); without it, or on a branch with no PR, it stays silent.
const poll = async ($: EngineInterface): Promise<void> => {
  const ran = await $.process
    .run(['gh', 'pr', 'view', '--json', 'number,reviewDecision'], { timeoutMs: 15000 })
    .catch(() => undefined)

  if (ran === undefined || ran.exitCode !== 0) {
    return
  }

  let pr: Pr

  try {
    pr = JSON.parse(ran.stdout) as Pr
  } catch {
    return
  }

  if (pr.number === undefined) {
    return
  }

  const decision = pr.reviewDecision ?? ''
  const isChange = seen.number === pr.number && seen.decision !== decision
  seen.number = pr.number
  seen.decision = decision

  if (isChange) {
    const s = await strings($)
    const label = decision === 'APPROVED' || decision === 'CHANGES_REQUESTED' || decision === 'REVIEW_REQUIRED' ? s[decision] : s.none
    await $.ui.notify(s.changed(pr.number, label), { title: s.title }).catch(() => undefined)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    seen.number = undefined
    seen.decision = ''
    void poll($)
    $.clock.every(POLL_MS, () => void poll($))

    return next(e)
  })
}
