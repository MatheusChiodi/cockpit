import type { Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const MAX_BYTES = 100 * 1024

// `cat file`, `type file`, `Get-Content file` with one plain path and nothing piped or redirected.
const WHOLE = /^\s*(?:cat|type|Get-Content|gc)\s+(?:"([^"]+)"|'([^']+)'|([^\s"'|;&<>-][^\s|;&<>]*))\s*$/i

export const register: Register = on => {
  // The shell route around big-read-guard: dumping a whole big file into the context.
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const hit = WHOLE.exec(e.command)
    const path = hit?.[1] ?? hit?.[2] ?? hit?.[3]

    if (path === undefined) {
      return next(e)
    }

    const stat = await $.fs.stat(path).catch(() => undefined)

    if (stat === undefined || stat.kind !== 'file' || stat.size <= MAX_BYTES) {
      return next(e)
    }

    const s = STRINGS[(await $.state.get(LANG)).value ?? 'en']

    return { deny: s.tooBig(path, Math.round(stat.size / 1024)) }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))
}
