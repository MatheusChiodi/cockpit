const en = {
  blocked: (path: string, size: string) =>
    `large-write-guard blocked the write: ${path} would be ${size}. Split it into smaller files or generate it with a script.`,
  failed: 'large-write-guard: the check failed, write refused.',
  lines: (n: number) => `${n.toLocaleString('en-US')} lines`,
  kb: (n: number) => `${n.toLocaleString('en-US')} KB`,
}

type Strings = typeof en

const pt: Strings = {
  blocked: (path, size) =>
    `large-write-guard bloqueou a gravação: ${path} teria ${size}. Divida em arquivos menores ou gere com um script.`,
  failed: 'large-write-guard: a verificação falhou, gravação recusada.',
  lines: n => `${n.toLocaleString('pt-BR')} linhas`,
  kb: n => `${n.toLocaleString('pt-BR')} KB`,
}

const es: Strings = {
  blocked: (path, size) =>
    `large-write-guard bloqueó la escritura: ${path} tendría ${size}. Divídelo en archivos más pequeños o genéralo con un script.`,
  failed: 'large-write-guard: la verificación falló, escritura rechazada.',
  lines: n => `${n.toLocaleString('es-ES')} líneas`,
  kb: n => `${n.toLocaleString('es-ES')} KB`,
}

export const STRINGS = { en, pt, es }
