import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('pr-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

type PullRequest = { number?: number; state?: string; isDraft?: boolean; reviewDecision?: string }

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Needs the authenticated GitHub CLI (`gh`); with no PR on the current branch, it shows nothing.
const refresh = async ($: EngineInterface): Promise<void> => {
  const ran = await $.process
    .run(['gh', 'pr', 'view', '--json', 'number,state,isDraft,reviewDecision'], { timeoutMs: 15000 })
    .catch(() => undefined)

  if (ran === undefined || ran.exitCode !== 0) {
    void show($, undefined)

    return
  }

  let pr: PullRequest = {}

  try {
    pr = JSON.parse(ran.stdout) as PullRequest
  } catch {
    pr = {}
  }

  if (pr.number === undefined) {
    void show($, undefined)

    return
  }

  const s = await strings($)
  const review: Record<string, string> = {
    APPROVED: s.approved,
    CHANGES_REQUESTED: s.changes,
    REVIEW_REQUIRED: s.waiting,
  }
  const state =
    pr.state === 'MERGED'
      ? s.merged
      : pr.state === 'CLOSED'
        ? s.closed
        : pr.isDraft === true
          ? s.draft
          : (review[pr.reviewDecision ?? ''] ?? s.open)

  void show($, `${s.label} #${pr.number} ${state}`)
}

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.start', ($, e, next) => {
    void refresh($)
    $.clock.every(180000, () => void refresh($))

    return next(e)
  })
}
