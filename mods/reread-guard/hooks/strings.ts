const en = {
  again: (path: string) =>
    `reread-guard: ${path} is unchanged and already in the context. Use what was read, or Grep for the line. Repeat the call to read it anyway.`,
  failed: 'reread-guard: the check failed, read refused.',
}

type Strings = typeof en

const pt: Strings = {
  again: path =>
    `reread-guard: ${path} não mudou e já está no contexto. Use o que foi lido, ou procure a linha com Grep. Repita a chamada para ler mesmo assim.`,
  failed: 'reread-guard: a verificação falhou, leitura recusada.',
}

const es: Strings = {
  again: path =>
    `reread-guard: ${path} no cambió y ya está en el contexto. Usa lo que se leyó, o busca la línea con Grep. Repite la llamada para leerlo de todos modos.`,
  failed: 'reread-guard: la verificación falló, lectura rechazada.',
}

export const STRINGS = { en, pt, es }
