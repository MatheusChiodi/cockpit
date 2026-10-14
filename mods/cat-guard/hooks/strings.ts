const en = {
  tooBig: (path: string, kb: number) =>
    `cat-guard: ${path} is ${kb} KB. Read a slice with offset/limit, or use tail, head or Grep.`,
  failed: 'cat-guard: the check failed, command refused.',
}

type Strings = typeof en

const pt: Strings = {
  tooBig: (path, kb) =>
    `cat-guard: ${path} tem ${kb} KB. Leia um trecho com offset/limit, ou use tail, head ou Grep.`,
  failed: 'cat-guard: a verificação falhou, comando recusado.',
}

const es: Strings = {
  tooBig: (path, kb) =>
    `cat-guard: ${path} pesa ${kb} KB. Lee un fragmento con offset/limit, o usa tail, head o Grep.`,
  failed: 'cat-guard: la verificación falló, comando rechazado.',
}

export const STRINGS = { en, pt, es }
