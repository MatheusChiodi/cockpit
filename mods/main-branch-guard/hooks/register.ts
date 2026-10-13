import type { EngineInterface, Register } from 'claude-code'

const WRITES_HISTORY = /\bgit\s+(commit|push|merge|rebase|cherry-pick|revert)\b/
const CREATES_BRANCH = /\bgit\s+(checkout\s+-[bB]|switch\s+-[cC])\b/
const PROTECTED = new Set(['main', 'master', 'production', 'prod'])

const verdict = async ($: EngineInterface, command: string): Promise<string | undefined> => {
  if (!WRITES_HISTORY.test(command) || CREATES_BRANCH.test(command)) {
    return undefined
  }

  const head = await $.process.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], { timeoutMs: 5000 })
  const branch = head.stdout.trim()

  return head.exitCode === 0 && PROTECTED.has(branch)
    ? `main-branch-guard: você está em "${branch}". Crie uma branch (git switch -c <nome>) antes de commit/push/merge.`
    : undefined
}

const FAILED = 'main-branch-guard: a verificação falhou, comando recusado.'

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const deny = await verdict($, e.command)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: FAILED }))

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) => {
    const deny = await verdict($, e.command)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: FAILED }))
}
