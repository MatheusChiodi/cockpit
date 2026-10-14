import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'
import type { Reason } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const RULES: readonly { pattern: RegExp; why: Reason }[] = [
  { pattern: /\bdrop\s+(table|database|schema|user|tablespace)\b/i, why: 'drop' },
  { pattern: /\btruncate\s+(table\s+)?[\w."`[\]]+/i, why: 'truncate' },
  { pattern: /\bdelete\s+from\s+[\w."`[\]]+\s*(;|"|'|$)/im, why: 'deleteAll' },
  { pattern: /\bupdate\s+[\w."`[\]]+\s+set\b(?![^;]*\bwhere\b)[^;]*(;|"|'|$)/im, why: 'updateAll' },
]

// Why the command is refused, in the session's language; undefined when it may run.
const verdict = async ($: EngineInterface, command: string): Promise<string | undefined> => {
  const why = RULES.find(rule => rule.pattern.test(command))?.why

  if (why === undefined) {
    return undefined
  }

  const s = await strings($)

  return s.blocked(s[why])
}

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const deny = await verdict($, e.command)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) => {
    const deny = await verdict($, e.command)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))
}
