import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// A check run has status + conclusion; a commit status has only state.
type Rollup = { status?: string; conclusion?: string; state?: string }

type View = {
  number?: number
  state?: string
  isDraft?: boolean
  mergeable?: string
  reviewDecision?: string
  statusCheckRollup?: Rollup[]
}

const FAILED = new Set(['FAILURE', 'ERROR', 'TIMED_OUT', 'CANCELLED', 'STARTUP_FAILURE', 'ACTION_REQUIRED'])

const failing = (check: Rollup) => FAILED.has(check.conclusion ?? check.state ?? '')

const running = (check: Rollup) =>
  check.state !== undefined ? check.state === 'PENDING' || check.state === 'EXPECTED' : check.status !== 'COMPLETED'

const judging = async ($: EngineInterface, typed: string): Promise<{ text: string }> => {
  const s = await strings($)

  if (typed !== '' && !/^\d+$/.test(typed)) {
    return { text: s.usage }
  }

  const fields = 'number,state,isDraft,mergeable,reviewDecision,statusCheckRollup'
  const ran = await $.process
    .run(['gh', 'pr', 'view', ...(typed === '' ? [] : [typed]), '--json', fields], { timeoutMs: 30000 })
    .catch(() => undefined)
  let pr: View = {}

  try {
    pr = ran?.exitCode === 0 ? (JSON.parse(ran.stdout) as View) : {}
  } catch {
    pr = {}
  }

  if (pr.number === undefined) {
    return { text: s.noGh }
  }

  if (pr.state !== undefined && pr.state !== 'OPEN') {
    return { text: s.closed(pr.number, pr.state) }
  }

  const checks = pr.statusCheckRollup ?? []
  const failed = checks.filter(failing).length
  const pending = checks.filter(check => !failing(check) && running(check)).length
  const review: Record<string, string> = { APPROVED: s.approved, CHANGES_REQUESTED: s.changes, REVIEW_REQUIRED: s.required }
  const lines = [
    pr.isDraft === true ? s.isDraft : undefined,
    pr.mergeable === 'CONFLICTING' ? s.conflicts : pr.mergeable === 'MERGEABLE' ? s.noConflicts : s.unknownMerge,
    failed > 0 ? s.checksFailing(failed) : pending > 0 ? s.checksPending(pending) : s.checksOk,
    review[pr.reviewDecision ?? ''] ?? s.noReview,
  ].filter((line): line is string => line !== undefined)
  const ready = lines.every(line => line.startsWith('✓'))

  return { text: [ready ? s.ready(pr.number) : s.notReady(pr.number), ...lines.map(line => `  ${line}`)].join('\n') }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'ready', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'ready' }, ($, e) => judging($, e.args.trim().replace(/^#/, '')))
}
