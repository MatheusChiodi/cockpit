const en = {
  command: 'List the files changed in the most commits among the last 300, lockfiles left out',
  hint: '[count]',
  usage: 'Usage: /churn [count 1-30]',
  noGit: 'Not a git repository with commits, or git is not responding.',
  none: 'No file changes in the recent history.',
  header: (commits: number) => `changes per file in the last ${commits} commits`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Lista os arquivos alterados em mais commits entre os últimos 300, sem lockfiles',
  hint: '[quantidade]',
  usage: 'Uso: /churn [quantidade 1-30]',
  noGit: 'Não é um repositório git com commits, ou o git não responde.',
  none: 'Nenhuma alteração de arquivo no histórico recente.',
  header: commits => `alterações por arquivo nos últimos ${commits} commits`,
}

const es: Strings = {
  command: 'Lista los archivos cambiados en más commits entre los últimos 300, sin lockfiles',
  hint: '[cantidad]',
  usage: 'Uso: /churn [cantidad 1-30]',
  noGit: 'No es un repositorio git con commits, o git no responde.',
  none: 'Ningún cambio de archivo en el historial reciente.',
  header: commits => `cambios por archivo en los últimos ${commits} commits`,
}

export const STRINGS = { en, pt, es }
