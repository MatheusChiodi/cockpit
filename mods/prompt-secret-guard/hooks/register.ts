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

export const register: Register = on => {
  // Barra o prompt antes de ele entrar na conversa (e no transcript).
  on('prompt.submit', ($, e, next) => {
    const kind = SECRETS.find(secret => secret.pattern.test(e.text))?.kind

    return kind === undefined
      ? next(e)
      : { drop: `prompt-secret-guard: o prompt contém ${kind}. Remova o segredo e envie de novo.` }
  }).catch(($, e, next) =>
    next.called ? next(e) : { drop: 'prompt-secret-guard: a verificação falhou, prompt não enviado.' },
  )
}
