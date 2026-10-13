import type { Register } from 'claude-code'

// Sempre geradas ou de terceiros.
const ALWAYS = /(^|[\\/])(node_modules|\.next|\.nuxt|\.expo|\.turbo|coverage|__pycache__|\.venv|\.git)[\\/]/i

// Nomes que também são pastas de código (src/build, app/out): só valem fora de uma pasta de fonte.
const AMBIGUOUS = /(^|[\\/])(dist|build|out|target|vendor)[\\/]/i
const SOURCE = /(^|[\\/])(src|app|lib|scripts|packages|tests?)[\\/]/i

const isGenerated = (path: string): boolean => {
  if (ALWAYS.test(path)) {
    return true
  }

  const at = path.search(AMBIGUOUS)

  return at >= 0 && !SOURCE.test(path.slice(0, at + 1))
}

const refusal = (path: string): string =>
  `generated-guard: ${path} fica em pasta gerada ou de dependências. Altere o código-fonte e gere de novo.`

const FAILED = 'generated-guard: a verificação falhou, edição recusada.'

export const register: Register = on => {
  on('tool.call', { tool: 'Edit' }, ($, e, next) =>
    isGenerated(e.file_path) ? { deny: refusal(e.file_path) } : next(e),
  ).catch(($, e, next) => (next.called ? next(e) : { deny: FAILED }))

  on('tool.call', { tool: 'Write' }, ($, e, next) =>
    isGenerated(e.file_path) ? { deny: refusal(e.file_path) } : next(e),
  ).catch(($, e, next) => (next.called ? next(e) : { deny: FAILED }))
}
