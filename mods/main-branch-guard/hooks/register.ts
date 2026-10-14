import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const WRITES_HISTORY = /\bgit\s+(commit|push|merge|rebase|cherry-pick|revert)\b/
const CREATES_BRANCH = /\bgit\s+(checkout\s+-[bB]|switch\s+-[cC])\b/
const PROTECTED = new Set(['main', 'master', 'production', 'prod'])

// Why the command is refused, in the session's language; undefined when it may run.
const verdict = async ($: EngineInterface, command: string): Promise<string | undefined> => {
  if (!WRITES_HISTORY.test(command) || CREATES_BRANCH.test(command)) {
    return undefined
  }

  const head = await $.process.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], { timeoutMs: 5000 })
  const branch = head.stdout.trim()

  return head.exitCode === 0 && PROTECTED.has(branch) ? (await strings($)).onProtected(branch) : undefined
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
