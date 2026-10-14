const en = {
  blocked: (path: string) =>
    `credential-file-guard blocked the access: "${path}" holds credentials. Ask the user for the specific value you need instead.`,
  failed: 'credential-file-guard: the check failed, access refused.',
}

type Strings = typeof en

const pt: Strings = {
  blocked: path =>
    `credential-file-guard bloqueou o acesso: "${path}" guarda credenciais. Peça ao usuário o valor específico de que precisa.`,
  failed: 'credential-file-guard: a verificação falhou, acesso recusado.',
}

const es: Strings = {
  blocked: path =>
    `credential-file-guard bloqueó el acceso: "${path}" guarda credenciales. Pide al usuario el valor específico que necesitas.`,
  failed: 'credential-file-guard: la verificación falló, acceso rechazado.',
}

export const STRINGS = { en, pt, es }
