const en = {
  denied: (kind: string, path: string) =>
    `secret-scan: the content for ${path} contains ${kind}. Use an environment variable instead of writing the secret to the file.`,
  failed: 'secret-scan: the check failed, write refused.',
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
  denied: (kind, path) =>
    `secret-scan: o conteúdo para ${path} contém ${kind}. Use variável de ambiente em vez de gravar o segredo no arquivo.`,
  failed: 'secret-scan: a verificação falhou, escrita recusada.',
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
  denied: (kind, path) =>
    `secret-scan: el contenido para ${path} contiene ${kind}. Usa una variable de entorno en lugar de guardar el secreto en el archivo.`,
  failed: 'secret-scan: la verificación falló, escritura rechazada.',
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
