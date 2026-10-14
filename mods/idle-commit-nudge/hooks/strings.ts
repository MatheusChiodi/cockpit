const en = {
  idle: (files: number) => `Idle for 10 min with ${files} uncommitted ${files === 1 ? 'file' : 'files'}`,
}

type Strings = typeof en

const pt: Strings = {
  idle: files => `Parado há 10 min com ${files} ${files === 1 ? 'arquivo' : 'arquivos'} sem commit`,
}

const es: Strings = {
  idle: files => `Inactivo hace 10 min con ${files} ${files === 1 ? 'archivo' : 'archivos'} sin commit`,
}

export const STRINGS = { en, pt, es }
