const en = {
  label: 'read-only',
  files: (count: number, total: number) => `${count} of ${total} files`,
}

type Strings = typeof en

const pt: Strings = {
  label: 'só leitura',
  files: (count, total) => `${count} de ${total} arquivos`,
}

const es: Strings = {
  label: 'solo lectura',
  files: (count, total) => `${count} de ${total} archivos`,
}

export const STRINGS = { en, pt, es }
