import type { Register } from 'claude-code'

const ENV_FILE = /(^|[\\/])\.env(\.[^\\/]*)?$/i
const TEMPLATE = /\.(example|sample|template|dist)$/i
const SHELL_READ =
  /\b(cat|less|more|head|tail|bat|type|gc|Get-Content|source)\s[^|;&\n]*?(?<![\w.-])\.env(?!\.(?:example|sample|template|dist)\b)(?:\.[\w-]+)*(?![\w.-])/i

const isProtected = (path: string): boolean => ENV_FILE.test(path) && !TEMPLATE.test(path)

const refusal = (path: string): string =>
  `env-guard: ${path} guarda segredos e está protegido. Use um .env.example ou peça ao usuário.`

const FAILED = 'env-guard: a verificação falhou, acesso recusado.'

export const register: Register = on => {
  on('tool.call', { tool: 'Read' }, ($, e, next) =>
    isProtected(e.file_path) ? { deny: refusal(e.file_path) } : next(e),
  ).catch(($, e, next) => (next.called ? next(e) : { deny: FAILED }))

  on('tool.call', { tool: 'Edit' }, ($, e, next) =>
    isProtected(e.file_path) ? { deny: refusal(e.file_path) } : next(e),
  ).catch(($, e, next) => (next.called ? next(e) : { deny: FAILED }))

  on('tool.call', { tool: 'Write' }, ($, e, next) =>
    isProtected(e.file_path) ? { deny: refusal(e.file_path) } : next(e),
  ).catch(($, e, next) => (next.called ? next(e) : { deny: FAILED }))

  on('tool.call', { tool: 'Bash' }, ($, e, next) =>
    SHELL_READ.test(e.command) ? { deny: refusal('.env') } : next(e),
  ).catch(($, e, next) => (next.called ? next(e) : { deny: FAILED }))

  on('tool.call', { tool: 'PowerShell' }, ($, e, next) =>
    SHELL_READ.test(e.command) ? { deny: refusal('.env') } : next(e),
  ).catch(($, e, next) => (next.called ? next(e) : { deny: FAILED }))

  // @.env no prompt também lê o arquivo, sem passar por tool.call.
  on('prompt.mention', ($, e, next) =>
    isProtected(e.path) ? { deny: refusal(e.path) } : next(e),
  ).catch(($, e, next) => (next.called ? next(e) : { deny: FAILED }))
}
