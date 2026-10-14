import type { Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const MAX_LINES = 300

// A Read is a slice Claude chose and these tools do not return a listing.
const IGNORED = new Set(['Read', 'Edit', 'Write', 'NotebookEdit', 'Agent', 'Task', 'TodoWrite'])

// `text` is the result as the model reads it; a hook's own answer has none.
const linesOf = (ran: { text?: string; result?: unknown }): number =>
  (ran.text ?? JSON.stringify(ran.result ?? '').replace(/\\n/g, '\n')).split('\n').length

export const register: Register = on => {
  // The result of a search or command that came back with hundreds of lines: say so to the one who must read it.
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny !== undefined || ran.isError === true || IGNORED.has(String(e.tool))) {
      return ran
    }

    const lines = linesOf(ran)

    if (lines <= MAX_LINES) {
      return ran
    }

    const s = STRINGS[(await $.state.get(LANG)).value ?? 'en']
    $.ui.toast(s.told(String(e.tool), lines.toLocaleString(s.locale)), { timeoutMs: 5000 })

    return {
      ...ran,
      context: [
        ...(ran.context ?? []),
        `flood-note: that result was ${lines} lines (about ${Math.round(lines / 40) * 100} tokens) now sitting in the context. Do not repeat it wide: narrow the next search with a more specific pattern, path or head_limit, or pipe the command through head, tail or grep.`,
      ],
    }
  })
}
