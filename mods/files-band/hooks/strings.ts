const en = {
  label: 'files',
  changed: (n: number) => `${n} changed`,
}

type Strings = typeof en

const pt: Strings = {
  label: 'arquivos',
  changed: (n: number) => `${n} alterado${n === 1 ? '' : 's'}`,
}

const es: Strings = {
  label: 'archivos',
  changed: (n: number) => `${n} modificado${n === 1 ? '' : 's'}`,
}

export const STRINGS = { en, pt, es }
