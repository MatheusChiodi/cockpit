const en = {
  dropped: (kind: string) => `prompt-secret-guard: the prompt contains ${kind}. Remove the secret and send it again.`,
  failed: 'prompt-secret-guard: the check failed, prompt not sent.',
  aws: 'an AWS access key',
  privateKey: 'a private key',
  anthropic: 'an Anthropic API key',
  apiKey: 'an API key (sk-...)',
  github: 'a GitHub token',
  slack: 'a Slack token',
  google: 'a Google API key',
  stripe: 'a Stripe live key',
}

type Strings = typeof en

const pt: Strings = {
  dropped: kind => `prompt-secret-guard: o prompt contém ${kind}. Remova o segredo e envie de novo.`,
  failed: 'prompt-secret-guard: a verificação falhou, prompt não enviado.',
  aws: 'chave de acesso AWS',
  privateKey: 'chave privada',
  anthropic: 'chave da API Anthropic',
  apiKey: 'chave de API (sk-...)',
  github: 'token do GitHub',
  slack: 'token do Slack',
  google: 'chave de API Google',
  stripe: 'chave live da Stripe',
}

const es: Strings = {
  dropped: kind => `prompt-secret-guard: el prompt contiene ${kind}. Quita el secreto y envíalo de nuevo.`,
  failed: 'prompt-secret-guard: la verificación falló, prompt no enviado.',
  aws: 'una clave de acceso de AWS',
  privateKey: 'una clave privada',
  anthropic: 'una clave de la API de Anthropic',
  apiKey: 'una clave de API (sk-...)',
  github: 'un token de GitHub',
  slack: 'un token de Slack',
  google: 'una clave de API de Google',
  stripe: 'una clave live de Stripe',
}

export type Kind = 'aws' | 'privateKey' | 'anthropic' | 'apiKey' | 'github' | 'slack' | 'google' | 'stripe'

export const STRINGS = { en, pt, es }
