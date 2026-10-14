const en = {
  missing: (count: number) => `${count} ${count === 1 ? 'file' : 'files'} changed, no tests run this turn`,
}

type Strings = typeof en

const pt: Strings = {
  missing: count => `${count} ${count === 1 ? 'arquivo alterado' : 'arquivos alterados'}, nenhum teste rodou neste turno`,
}

const es: Strings = {
  missing: count => `${count} ${count === 1 ? 'archivo cambiado' : 'archivos cambiados'}, ningún test se ejecutó en este turno`,
}

export const STRINGS = { en, pt, es }
