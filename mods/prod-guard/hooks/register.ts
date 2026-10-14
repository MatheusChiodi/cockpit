import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'
import type { What } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const RULES: readonly { pattern: RegExp; what: What }[] = [
  { pattern: /\b(vercel|netlify\s+deploy)\b[^|;&\n]*--prod\b/, what: 'deploy' },
  { pattern: /\bfirebase\s+deploy\b/, what: 'firebase' },
  { pattern: /\bterraform\s+(apply|destroy)\b/, what: 'terraform' },
  { pattern: /\bkubectl\s+(apply|delete|scale|rollout)\b/, what: 'kubernetes' },
  { pattern: /\beas\s+(submit|update)\b|\beas\s+build\b[^|;&\n]*production/, what: 'eas' },
  { pattern: /\b(npm|pnpm|yarn)\s+publish\b/, what: 'publish' },
  { pattern: /\bdocker\s+push\b/, what: 'dockerPush' },
  { pattern: /\bgh\s+release\s+create\b/, what: 'release' },
  { pattern: /\b(prisma\s+migrate\s+deploy|flyway\s+migrate|liquibase\s+update)\b/, what: 'migration' },
  { pattern: /\b(NODE_ENV|APP_ENV|ENV)=prod(uction)?\b/, what: 'prodEnv' },
]

const commandOf = (input: unknown): string =>
  typeof input === 'object' && input !== null && typeof (input as { command?: unknown }).command === 'string'
    ? (input as { command: string }).command
    : ''

// The confirmation reason, in the session's language; undefined when the call is not a production action.
const reasonFor = async ($: EngineInterface, tool: string, input: unknown): Promise<string | undefined> => {
  const what =
    tool === 'Bash' || tool === 'PowerShell'
      ? RULES.find(rule => rule.pattern.test(commandOf(input)))?.what
      : undefined

  if (what === undefined) {
    return undefined
  }

  const s = await strings($)

  return s.confirm(s[what])
}

export const register: Register = on => {
  // Does not block: requires the person's confirmation, even when the command is already allowed by permissions.
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)
    const reason = verdict.decision === 'allow' ? await reasonFor($, e.tool, e.input) : undefined

    return reason === undefined ? verdict : { decision: 'ask', reason }
  }).catch(() => ({ decision: 'ask', reason: STRINGS.en.failed }))
}
