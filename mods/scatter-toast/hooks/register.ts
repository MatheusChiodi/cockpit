import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// At least this many files in at least this many folders, in a single turn.
const MIN_FILES = 8
const MIN_AREAS = 4
const TOAST_MS = 12000

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Module state: the files changed by the main loop in the turn that is running.
const turn: { files: Set<string> } = { files: new Set() }

const slashed = (path: string): string => path.split(String.fromCharCode(92)).join('/')

// A folder area is the first two folders under the project root; a file at the root is its own area.
const areaOf = (path: string, root: string): string => {
  const base = slashed(root).replace(/\/$/, '')
  const full = slashed(path)
  const relative = full.toLowerCase().startsWith(`${base.toLowerCase()}/`) ? full.slice(base.length + 1) : full
  const folders = relative.split('/').slice(0, -1)

  return folders.slice(0, 2).join('/') || '.'
}

const note = (path: string, agentId: unknown): void => {
  if (agentId === undefined) {
    turn.files.add(path)
  }
}

export const register: Register = on => {
  on('turn.start', (_$, e, next) => {
    turn.files = new Set()

    return next(e)
  })

  on('tool.call', { tool: 'Edit' }, async (_$, e, next) => {
    const ran = await next(e)
    note(e.file_path, (e as { agentId?: string }).agentId)

    return ran
  })

  on('tool.call', { tool: 'Write' }, async (_$, e, next) => {
    const ran = await next(e)
    note(e.file_path, (e as { agentId?: string }).agentId)

    return ran
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined && turn.files.size >= MIN_FILES) {
      const root = await $.session.root()
      const areas = new Set([...turn.files].map(path => areaOf(path, root)))

      if (areas.size >= MIN_AREAS) {
        $.ui.toast((await strings($)).scattered(turn.files.size, areas.size), { timeoutMs: TOAST_MS })
      }
    }

    turn.files = new Set()

    return next(e)
  })
}
