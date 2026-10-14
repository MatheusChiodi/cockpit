import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'
import type { Reason } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const RULES: readonly { pattern: RegExp; why: Reason }[] = [
  {
    pattern: /\bgit\s+push\b(?=[^|;&\n]*(\s--force(?!-with-lease)\b|\s-[a-zA-Z]*f[a-zA-Z]*\b))/,
    why: 'forcePush',
  },
  { pattern: /\bgit\s+reset\b[^|;&\n]*\s--hard\b/, why: 'resetHard' },
  { pattern: /\bgit\s+clean\b[^|;&\n]*\s-[a-zA-Z]*f/, why: 'clean' },
  { pattern: /\bgit\s+(checkout|restore)\s+(--\s+)?\.(\s|$)/, why: 'discardAll' },
  { pattern: /\bgit\s+(commit|push|merge)\b[^|;&\n]*\s--no-verify\b/, why: 'noVerify' },
  { pattern: /\bgit\s+stash\s+(clear|drop)\b/, why: 'stash' },
  { pattern: /\bgit\s+branch\b[^|;&\n]*\s-D\b/, why: 'branchDelete' },
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
