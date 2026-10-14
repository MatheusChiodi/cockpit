import type { Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

// Installing a NEW package (by name). A bare `npm install` / `npm ci` passes straight through.
const ADDS_PACKAGE: readonly RegExp[] = [
  /\bnpm\s+(install|i|add)\s+(?:-{1,2}[\w-]+\s+)*(?!-)[@\w]/,
  /\b(pnpm|yarn|bun)\s+add\s+\S/,
  /\bpip3?\s+install\s+(?:-{1,2}[\w-]+\s+)*(?!-r\b|-e\b|\.)[\w]/,
  /\b(cargo\s+add|go\s+get|gem\s+install|composer\s+require|dotnet\s+add\s+package)\s+\S/,
  /\bnpx\s+(?:-{1,2}[\w-]+\s+)*expo\s+install\s+\S/,
]

const commandOf = (input: unknown): string =>
  typeof input === 'object' && input !== null && typeof (input as { command?: unknown }).command === 'string'
    ? (input as { command: string }).command
    : ''

export const register: Register = on => {
  // A new dependency is the person's decision: Claude always asks before installing.
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)
    const isInstall =
      (e.tool === 'Bash' || e.tool === 'PowerShell') && ADDS_PACKAGE.some(pattern => pattern.test(commandOf(e.input)))

    if (!isInstall || verdict.decision !== 'allow') {
      return verdict
    }

    const s = STRINGS[(await $.state.get(LANG)).value ?? 'en']

    return { decision: 'ask', reason: s.confirm }
  }).catch(() => ({ decision: 'ask', reason: STRINGS.en.failed }))
}
