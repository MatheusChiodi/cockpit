import type { Register } from 'claude-code'

const LOCKFILE =
  /(^|[\\/])(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|poetry\.lock|uv\.lock|Pipfile\.lock|composer\.lock|Gemfile\.lock|go\.sum)$/i

const refusal = (path: string): string =>
  `lockfile-guard: ${path} é gerado pelo gerenciador de pacotes. Rode o comando de install/update em vez de editar à mão.`

const FAILED = 'lockfile-guard: a verificação falhou, edição recusada.'

export const register: Register = on => {
  on('tool.call', { tool: 'Edit' }, ($, e, next) =>
    LOCKFILE.test(e.file_path) ? { deny: refusal(e.file_path) } : next(e),
  ).catch(($, e, next) => (next.called ? next(e) : { deny: FAILED }))

  on('tool.call', { tool: 'Write' }, ($, e, next) =>
    LOCKFILE.test(e.file_path) ? { deny: refusal(e.file_path) } : next(e),
  ).catch(($, e, next) => (next.called ? next(e) : { deny: FAILED }))
}
