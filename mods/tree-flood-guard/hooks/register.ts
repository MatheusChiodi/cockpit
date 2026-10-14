import type { Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

// Anything that narrows or consumes the listing makes it harmless.
const PIPED = /[|>]/

const FIND = /^\s*find\s/
const FIND_FILTER = /\s-(?:i?name|i?path|iwholename|wholename|regex|maxdepth|prune|newer|mtime|mmin|size|empty)\b/

const LS = /^\s*ls\s+(?:-\w*R\w*|--recursive)\b/

const DIR = /^\s*dir\b.*\s\/s\b/i
const GCI = /^\s*(?:Get-ChildItem|gci)\b.*-Recurse\b/i
const GCI_FILTER = /\s-(?:Filter|Include|Depth|Name)\b/i

const verdict = (command: string): 'find' | 'ls' | 'dir' | undefined => {
  if (PIPED.test(command)) {
    return undefined
  }

  if (FIND.test(command) && !FIND_FILTER.test(command)) {
    return 'find'
  }

  if (LS.test(command)) {
    return 'ls'
  }

  if (DIR.test(command) || (GCI.test(command) && !GCI_FILTER.test(command))) {
    return 'dir'
  }

  return undefined
}

export const register: Register = on => {
  // An unfiltered recursive listing walks node_modules and build output straight into the context.
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const kind = verdict(e.command)

    if (kind === undefined) {
      return next(e)
    }

    const s = STRINGS[(await $.state.get(LANG)).value ?? 'en']

    return { deny: s[kind] }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))
}
