import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const TOAST_MS = 8000

const JS = /\.(?:[cm]?[jt]sx?|vue|svelte)$/i
const PY = /\.pyi?$/i
const JVM = /\.(?:java|kt|kts|scala)$/i
const CODE = /\.(?:[cm]?[jt]sx?|vue|svelte|pyi?|java|kt|kts|scala|go|rs|cs|rb|php)$/i
const TEST_FILE = /[.\-_](?:test|spec)\.|(?:^|[\\/])(?:tests?|__tests__)[\\/]|(?:^|[\\/])test_[^\\/]*$|Tests?\.(?:java|kt|cs)$/i

const LOGS: readonly { pattern: RegExp; files: RegExp }[] = [
  { pattern: /\bconsole\.(?:log|debug|dir|trace)\s*\(/g, files: JS },
  { pattern: /(?<![\w.])print\s*\(/g, files: PY },
  { pattern: /\bSystem\.out\.print(?:ln)?\s*\(/g, files: JVM },
]

const TODO = /\b(?:TODO|FIXME|XXX|HACK)\b/g

const turn = { logs: 0, todos: 0 }

const count = (pattern: RegExp, text: string): number => text.match(pattern)?.length ?? 0

// What the edit adds: how much more of each marker the new text has than the text it replaces.
const note = (path: string, before: string, after: string, e: unknown, ran: { deny?: string }): void => {
  if ((e as { agentId?: string }).agentId !== undefined || ran.deny !== undefined || !CODE.test(path) || TEST_FILE.test(path)) {
    return
  }

  for (const log of LOGS) {
    if (log.files.test(path)) {
      turn.logs += Math.max(0, count(log.pattern, after) - count(log.pattern, before))
    }
  }

  turn.todos += Math.max(0, count(TODO, after) - count(TODO, before))
}

export const register: Register = on => {
  on('turn.start', (_, e, next) => {
    turn.logs = 0
    turn.todos = 0

    return next(e)
  })

  on('tool.call', { tool: 'Edit' }, async (_, e, next) => {
    const ran = await next(e)
    note(e.file_path, e.old_string, e.new_string, e, ran)

    return ran
  })

  on('tool.call', { tool: 'Write' }, async (_, e, next) => {
    const ran = await next(e)
    note(e.file_path, '', e.content, e, ran)

    return ran
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined && !e.isAborted && (turn.logs > 0 || turn.todos > 0)) {
      const s = await strings($)
      const parts = [turn.logs > 0 ? s.logs(turn.logs) : '', turn.todos > 0 ? s.todos(turn.todos) : ''].filter(Boolean)
      $.ui.toast(s.left(parts.join(', ')), { timeoutMs: TOAST_MS })
    }

    turn.logs = 0
    turn.todos = 0

    return next(e)
  })
}
