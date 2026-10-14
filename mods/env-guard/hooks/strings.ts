const en = {
  denied: (path: string) => `env-guard: ${path} holds secrets and is protected. Use a .env.example or ask the user.`,
  failed: 'env-guard: the check failed, access refused.',
}

type Strings = typeof en

const pt: Strings = {
  denied: path => `env-guard: ${path} guarda segredos e está protegido. Use um .env.example ou peça ao usuário.`,
  failed: 'env-guard: a verificação falhou, acesso recusado.',
}

const es: Strings = {
  denied: path => `env-guard: ${path} guarda secretos y está protegido. Usa un .env.example o pídeselo al usuario.`,
  failed: 'env-guard: la verificación falló, acceso rechazado.',
}

export const STRINGS = { en, pt, es }
