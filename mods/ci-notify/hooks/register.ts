import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Run = { databaseId?: number; status?: string; conclusion?: string | null; workflowName?: string }

const POLL_MS = 120000

// The run seen in progress: when it shows up completed, the person hears of it once.
const watching: { id: number | undefined } = { id: undefined }

// Needs the authenticated GitHub CLI (`gh`); without it, or outside a GitHub repo, it stays silent.
const poll = async ($: EngineInterface): Promise<void> => {
  const ran = await $.process
    .run(['gh', 'run', 'list', '--limit', '1', '--json', 'databaseId,status,conclusion,workflowName'], {
      timeoutMs: 15000,
    })
    .catch(() => undefined)

  if (ran === undefined || ran.exitCode !== 0) {
    return
  }

  let last: Run | undefined

  try {
    last = (JSON.parse(ran.stdout) as Run[])[0]
  } catch {
    last = undefined
  }

  if (last === undefined) {
    return
  }

  if (last.status !== 'completed') {
    watching.id = last.databaseId

    return
  }

  if (watching.id === undefined || watching.id !== last.databaseId) {
    return
  }

  watching.id = undefined
  const s = await strings($)
  const name = last.workflowName ?? s.workflow
  const text =
    last.conclusion === 'success' ? s.passed(name) : s.failed(name, last.conclusion ?? s.unknown)
  await $.ui.notify(text, { title: s.title }).catch(() => undefined)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    watching.id = undefined
    void poll($)
    $.clock.every(POLL_MS, () => void poll($))

    return next(e)
  })
}
