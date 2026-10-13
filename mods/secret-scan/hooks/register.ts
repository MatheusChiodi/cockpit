import type { Register } from 'claude-code'

const SECRETS: readonly { pattern: RegExp; kind: string }[] = [
  { pattern: /\bAKIA[0-9A-Z]{16}\b/, kind: 'chave de acesso AWS' },
  { pattern: /-----BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/, kind: 'chave privada' },
  { pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}/, kind: 'chave da API Anthropic' },
  { pattern: /\bsk-(proj-)?[A-Za-z0-9_-]{32,}/, kind: 'chave de API (sk-...)' },
  { pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/, kind: 'token do GitHub' },
  { pattern: /\bgithub_pat_[A-Za-z0-9_]{40,}/, kind: 'token do GitHub' },
  { pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}/, kind: 'token do Slack' },
  { pattern: /\bAIza[0-9A-Za-z_-]{35}\b/, kind: 'chave de API Google' },
  { pattern: /\b[sr]k_live_[0-9a-zA-Z]{24,}/, kind: 'chave live da Stripe' },
]

const found = (text: string): string | undefined =>
  SECRETS.find(secret => secret.pattern.test(text))?.kind

const refusal = (kind: string, path: string): string =>
  `secret-scan: o conteúdo para ${path} contém ${kind}. Use variável de ambiente em vez de gravar o segredo no arquivo.`

const FAILED = 'secret-scan: a verificação falhou, escrita recusada.'

export const register: Register = on => {
  on('tool.call', { tool: 'Write' }, ($, e, next) => {
    const kind = found(e.content)

    return kind === undefined ? next(e) : { deny: refusal(kind, e.file_path) }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: FAILED }))

  on('tool.call', { tool: 'Edit' }, ($, e, next) => {
    const kind = found(e.new_string)

    return kind === undefined ? next(e) : { deny: refusal(kind, e.file_path) }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: FAILED }))
}
