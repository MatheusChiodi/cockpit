import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const UPDATE: readonly RegExp[] = [
  /\b(?:jest|vitest)\b[^|;&\n]*(?:\s-u\b|--updateSnapshot\b|--update\b)/,
  /\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test\b[^|;&\n]*(?:\s-u\b|--updateSnapshot\b|--update\b)/,
  /--snapshot-update\b/,
  /--update-snapshots\b/,
  /\binsta\s+(?:accept|review)\b/,
  /\bINSTA_UPDATE=(?:always|new)\b/,
  /\bUPDATE_SNAPSHOTS?=/,
  /\bgo\s+test\b[^|;&\n]*\s-update\b/,
]

const commandOf = (input: unknown): string =>
  typeof input === 'object' && input !== null && typeof (input as { command?: unknown }).command === 'string'
    ? (input as { command: string }).command
    : ''

const isUpdate = (tool: string, input: unknown): boolean =>
  (tool === 'Bash' || tool === 'PowerShell') && UPDATE.some(pattern => pattern.test(commandOf(input)))

export const register: Register = on => {
  // Does not block: requires the person's confirmation, even when the command is already allowed by permissions.
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)

    return verdict.decision === 'allow' && isUpdate(e.tool, e.input)
      ? { decision: 'ask', reason: (await strings($)).confirm }
      : verdict
  }).catch(() => ({ decision: 'ask', reason: STRINGS.en.failed }))
}
