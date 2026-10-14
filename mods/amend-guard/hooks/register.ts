import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const AMEND = /\bgit\s+commit\b[^|;&\n]*--amend\b/
const REBASE = /\bgit\s+rebase\b(?![^|;&\n]*--(abort|continue|skip|quit)\b)/

const commandOf = (input: unknown): string =>
  typeof input === 'object' && input !== null && typeof (input as { command?: unknown }).command === 'string'
    ? (input as { command: string }).command
    : ''

// The confirmation reason when the command rewrites a commit a remote branch already holds.
const reasonFor = async ($: EngineInterface, command: string): Promise<string | undefined> => {
  const kind = AMEND.test(command) ? 'amend' : REBASE.test(command) ? 'rebase' : undefined

  if (kind === undefined) {
    return undefined
  }

  const ran = await $.process.run(['git', '--no-pager', 'branch', '-r', '--contains', 'HEAD'], { timeoutMs: 10000 })
  const remote = ran.exitCode === 0 ? ran.stdout.split('\n').map(line => line.trim()).find(line => line !== '' && !line.includes('->')) : undefined

  if (remote === undefined) {
    return undefined
  }

  const s = await strings($)

  return s.confirm(s[kind], remote)
}

export const register: Register = on => {
  // Does not block: asks first when the commit being rewritten is already on a remote branch.
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)
    const tool = String(e.tool)
    const reason =
      verdict.decision === 'allow' && (tool === 'Bash' || tool === 'PowerShell')
        ? await reasonFor($, commandOf(e.input))
        : undefined

    return reason === undefined ? verdict : { decision: 'ask', reason }
  }).catch(() => ({ decision: 'ask', reason: STRINGS.en.failed }))
}
