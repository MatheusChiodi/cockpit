const en = {
  tooBig: (path: string, kb: number) =>
    `big-read-guard: ${path} is ${kb} KB. Read a slice with offset/limit or search with Grep.`,
  failed: 'big-read-guard: the check failed, read refused.',
}

type Strings = typeof en

const pt: Strings = {
  tooBig: (path, kb) =>
    `big-read-guard: ${path} tem ${kb} KB. Leia um trecho com offset/limit ou procure com Grep.`,
  failed: 'big-read-guard: a verificação falhou, leitura recusada.',
}

const es: Strings = {
  tooBig: (path, kb) =>
    `big-read-guard: ${path} pesa ${kb} KB. Lee un fragmento con offset/limit o busca con Grep.`,
  failed: 'big-read-guard: la verificación falló, lectura rechazada.',
}

export const STRINGS = { en, pt, es }
