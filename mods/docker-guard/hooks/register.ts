import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'
import type { Reason } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const FORCE = String.raw`\s(?:-[a-zA-Z]*f[a-zA-Z]*|--force)(?=\s|$)`

const RULES: readonly { pattern: RegExp; why: Reason }[] = [
  { pattern: /\bdocker\s+system\s+prune\b/, why: 'prune' },
  { pattern: /\bdocker\s+volume\s+(?:rm|remove|prune)\b/, why: 'volume' },
  { pattern: new RegExp(String.raw`\bdocker\s+(?:container\s+)?rm\b[^|;&\n]*${FORCE}`), why: 'rm' },
  { pattern: new RegExp(String.raw`\bdocker\s+(?:rmi|image\s+rm)\b[^|;&\n]*${FORCE}`), why: 'rmi' },
  {
    pattern: /\bdocker(?:-|\s+)compose\b[^|;&\n]*\sdown\b[^|;&\n]*\s(?:-[a-zA-Z]*v[a-zA-Z]*|--volumes)(?=\s|$)/,
    why: 'down',
  },
]

const commandOf = (input: unknown): string =>
  typeof input === 'object' && input !== null && typeof (input as { command?: unknown }).command === 'string'
    ? (input as { command: string }).command
    : ''

const reasonFor = async ($: EngineInterface, command: string): Promise<string | undefined> => {
  const why = RULES.find(rule => rule.pattern.test(command))?.why

  if (why === undefined) {
    return undefined
  }

  const s = await strings($)

  return s.ask(s[why])
}

export const register: Register = on => {
  // Does not block: asks the person, even when the command is already allowed in the permissions.
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)

    if (verdict.decision !== 'allow' || (e.tool !== 'Bash' && e.tool !== 'PowerShell')) {
      return verdict
    }

    const reason = await reasonFor($, commandOf(e.input))

    return reason === undefined ? verdict : { decision: 'ask', reason }
  }).catch(() => ({ decision: 'ask', reason: STRINGS.en.failed }))
}
