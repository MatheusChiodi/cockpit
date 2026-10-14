const en = {
  label: 'conflict',
  conflictedFiles: 'files in conflict',
  inProgress: (operation: string) => `${operation} in progress`,
  toResolve: (count: number) => `${count} file${count === 1 ? '' : 's'} to resolve`,
  nothingPending: 'nothing pending, just finish it',
}

type Strings = typeof en

const pt: Strings = {
  label: 'conflito',
  conflictedFiles: 'arquivos em conflito',
  inProgress: (operation: string) => `${operation} em andamento`,
  toResolve: (count: number) => `${count} arquivo${count === 1 ? '' : 's'} para resolver`,
  nothingPending: 'nada pendente, falta concluir',
}

const es: Strings = {
  label: 'conflicto',
  conflictedFiles: 'archivos en conflicto',
  inProgress: (operation: string) => `${operation} en curso`,
  toResolve: (count: number) => `${count} archivo${count === 1 ? '' : 's'} por resolver`,
  nothingPending: 'nada pendiente, falta concluir',
}

export const STRINGS = { en, pt, es }
