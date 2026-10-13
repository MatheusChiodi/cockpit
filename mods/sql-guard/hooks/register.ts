import type { Register } from 'claude-code'

const RULES: readonly { pattern: RegExp; why: string }[] = [
  { pattern: /\bdrop\s+(table|database|schema|user|tablespace)\b/i, why: 'DROP apaga o objeto inteiro' },
  { pattern: /\btruncate\s+(table\s+)?[\w."`[\]]+/i, why: 'TRUNCATE apaga todas as linhas sem rollback' },
  { pattern: /\bdelete\s+from\s+[\w."`[\]]+\s*(;|"|'|$)/im, why: 'DELETE sem WHERE apaga a tabela toda' },
  { pattern: /\bupdate\s+[\w."`[\]]+\s+set\b(?![^;]*\bwhere\b)[^;]*(;|"|'|$)/im, why: 'UPDATE sem WHERE altera todas as linhas' },
]

const verdict = (command: string): string | undefined => RULES.find(rule => rule.pattern.test(command))?.why

const refusal = (why: string): string =>
  `sql-guard bloqueou o comando: ${why}. Peça ao usuário para rodar manualmente se for intencional.`

const FAILED = 'sql-guard: a verificação falhou, comando recusado.'

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
