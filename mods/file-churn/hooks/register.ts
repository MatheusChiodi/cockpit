import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// This many edits to one file inside this window.
const TIMES = 6
const WINDOW_MS = 30 * 60000
const TOAST_MS = 12000

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Module state: when each file was edited, oldest first.
const edits: { byFile: Map<string, number[]> } = { byFile: new Map() }

const base = (path: string): string => path.split(/[\\/]/).at(-1) ?? path

const touch = async ($: EngineInterface, path: string, agentId: unknown): Promise<void> => {
  if (agentId !== undefined) {
    return
  }

  const now = await $.clock.now()
  const recent = [...(edits.byFile.get(path) ?? []), now].filter(at => now - at < WINDOW_MS)

  // Said once, then the count for that file starts over.
  if (recent.length >= TIMES) {
    edits.byFile.delete(path)
    $.ui.toast((await strings($)).churn(base(path), recent.length, Math.round(WINDOW_MS / 60000)), { timeoutMs: TOAST_MS })

    return
  }

  edits.byFile.set(path, recent)
}

export const register: Register = on => {
  on('session.start', (_$, e, next) => {
    edits.byFile = new Map()

    return next(e)
  })

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true) {
      await touch($, e.file_path, (e as { agentId?: string }).agentId)
    }

    return ran
  })
}
