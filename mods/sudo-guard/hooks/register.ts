import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'
import type { Reason } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// A command word: at the start of the command or after a separator, past env assignments and wrappers.
const HEAD = String.raw`(?:^|[;&|(\n])\s*(?:\w+=\S*\s+)*(?:(?:command|exec|time|nohup|xargs|env|builtin)\s+(?:-\S+\s+)*)*`

const RULES: readonly { pattern: RegExp; why: Reason }[] = [
  { pattern: new RegExp(`${HEAD}(?:sudo|gsudo|doas|pkexec)\\b`), why: 'sudo' },
  { pattern: new RegExp(`${HEAD}su\\b[^|;&\\n]*\\s-c\\b`), why: 'su' },
  { pattern: new RegExp(`${HEAD}runas\\b`, 'i'), why: 'runas' },
  { pattern: /\b(?:Start-Process|saps)\b[^|;&\n]*-Verb[\s:]+['"]?RunAs\b/i, why: 'runAs' },
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
