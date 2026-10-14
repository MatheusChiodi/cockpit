import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('ci-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Run ={ status?: string; conclusion?: string | null; workflowName?: string; headBranch?: string }

const POLL_MS = 120000

// Needs the authenticated GitHub CLI (`gh`); without it, or outside a GitHub repo, it shows nothing.
const refresh = async ($: EngineInterface): Promise<void> => {
  const ran = await $.process
    .run(['gh', 'run', 'list', '--limit', '1', '--json', 'status,conclusion,workflowName,headBranch'], {
      timeoutMs: 15000,
    })
    .catch(() => undefined)

  if (ran === undefined || ran.exitCode !== 0) {
    void show($, undefined)

    return
  }

  let runs: Run[] = []

  try {
    runs = JSON.parse(ran.stdout) as Run[]
  } catch {
    runs = []
  }

  const last = runs[0]

  if (last === undefined) {
    void show($, undefined)

    return
  }

  const s = await strings($)
  const mark =
    last.status !== 'completed' ? s.running : last.conclusion === 'success' ? '✓' : `✗ ${last.conclusion ?? s.failed}`

  void show($, `${s.label} ${mark} ${last.workflowName ?? s.workflow} · ${last.headBranch ?? '?'}`)
}

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.start', async ($, e, next) => {
    void refresh($)
    $.clock.every(POLL_MS, () => void refresh($))

    return next(e)
  })

  // A push triggers CI: check shortly after, without waiting for the next poll.
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    const command = (e as unknown as { command?: unknown }).command

    if (typeof command === 'string' && /\bgit\s+push\b/.test(command)) {
      $.clock.after(15000, () => void refresh($))
    }

    return ran
  })
}
