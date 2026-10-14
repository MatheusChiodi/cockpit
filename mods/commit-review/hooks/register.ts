import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const COMMIT = /\bgit\s+commit\b/
const ALL = /\bgit\s+commit\b[^|;&\n]*(\s-[a-zA-Z]*a[a-zA-Z]*\b|\s--all\b)/
const MAX_FILES = 10
const MAX_LINES = 300

const commandOf = (input: unknown): string =>
  typeof input === 'object' && input !== null && typeof (input as { command?: unknown }).command === 'string'
    ? (input as { command: string }).command
    : ''

// The confirmation reason when the commit is big; undefined when it is small or there is nothing to commit.
const reasonFor = async ($: EngineInterface, command: string): Promise<string | undefined> => {
  if (!COMMIT.test(command)) {
    return undefined
  }

  const against = ALL.test(command) ? ['HEAD'] : ['--cached']
  const ran = await $.process.run(['git', '--no-pager', 'diff', ...against, '--numstat'], { timeoutMs: 10000 })

  if (ran.exitCode !== 0) {
    return undefined
  }

  const rows = ran.stdout.split('\n').filter(line => line !== '')
  const lines = rows.reduce((sum, row) => {
    const [added = '0', removed = '0'] = row.split('\t')

    return sum + (Number.parseInt(added, 10) || 0) + (Number.parseInt(removed, 10) || 0)
  }, 0)

  return rows.length > MAX_FILES || lines > MAX_LINES ? (await strings($)).confirm(rows.length, lines) : undefined
}

export const register: Register = on => {
  // Does not block: asks the person to look at a big diff first.
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)
    const tool = String(e.tool)
    const reason = verdict.decision === 'allow' && (tool === 'Bash' || tool === 'PowerShell')
      ? await reasonFor($, commandOf(e.input))
      : undefined

    return reason === undefined ? verdict : { decision: 'ask', reason }
  }).catch(() => ({ decision: 'ask', reason: STRINGS.en.failed }))
}
