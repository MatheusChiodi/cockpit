import type { Register } from 'claude-code'

const RULES: readonly { pattern: RegExp; why: string }[] = [
  {
    pattern: /\bgit\s+push\b(?=[^|;&\n]*(\s--force(?!-with-lease)\b|\s-[a-zA-Z]*f[a-zA-Z]*\b))/,
    why: 'git push --force reescreve o histórico remoto (use --force-with-lease)',
  },
  { pattern: /\bgit\s+reset\b[^|;&\n]*\s--hard\b/, why: 'git reset --hard descarta alterações locais' },
  { pattern: /\bgit\s+clean\b[^|;&\n]*\s-[a-zA-Z]*f/, why: 'git clean -f apaga arquivos não versionados' },
  { pattern: /\bgit\s+(checkout|restore)\s+(--\s+)?\.(\s|$)/, why: 'descarta todas as alterações do diretório' },
  { pattern: /\bgit\s+(commit|push|merge)\b[^|;&\n]*\s--no-verify\b/, why: '--no-verify pula os hooks do repositório' },
  { pattern: /\bgit\s+stash\s+(clear|drop)\b/, why: 'apaga stashes sem volta' },
  { pattern: /\bgit\s+branch\b[^|;&\n]*\s-D\b/, why: 'git branch -D apaga a branch mesmo sem merge' },
]

const verdict = (command: string): string | undefined =>
  RULES.find(rule => rule.pattern.test(command))?.why

const refusal = (why: string): string =>
  `git-guard bloqueou o comando: ${why}. Peça ao usuário para rodar manualmente se for intencional.`

const FAILED = 'git-guard: a verificação falhou, comando recusado.'

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, ($, e, next) => {
    const why = verdict(e.command)

    return why === undefined ? next(e) : { deny: refusal(why) }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: FAILED }))

  on('tool.call', { tool: 'PowerShell' }, ($, e, next) => {
    const why = verdict(e.command)

    return why === undefined ? next(e) : { deny: refusal(why) }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: FAILED }))
}
