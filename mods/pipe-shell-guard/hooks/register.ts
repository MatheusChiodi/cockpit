import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'
import type { Reason } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const RULES: readonly { pattern: RegExp; why: Reason }[] = [
  { pattern: /\b(curl|wget)\b[^|;&\n]*\|\s*(sudo\s+)?(ba|z|da|fi)?sh\b/, why: 'pipeShell' },
  { pattern: /\b(curl|wget)\b[^|;&\n]*\|\s*(sudo\s+)?(python3?|node|perl|ruby)\b/, why: 'pipeInterpreter' },
  {
    pattern: /\b(iwr|irm|Invoke-WebRequest|Invoke-RestMethod)\b[^|;\n]*\|\s*(iex|Invoke-Expression)\b/i,
    why: 'pipeIex',
  },
  { pattern: /\b(iex|Invoke-Expression)\b[^;\n]*\bDownloadString\b/i, why: 'downloadString' },
  { pattern: /\b(ba|z)?sh\s+<\(\s*(curl|wget)\b/, why: 'processSubstitution' },
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
