const en = {
  command: 'List the files changed most recently, with when, from the last 100 commits',
  hint: '[count]',
  usage: 'Usage: /recent [count 1-30]',
  noGit: 'Not a git repository with commits, or git is not responding.',
  none: 'No file changes in the recent history.',
  more: (count: number) => `… ${count} more not shown`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Lista os arquivos alterados mais recentemente, com quando, nos últimos 100 commits',
  hint: '[quantidade]',
  usage: 'Uso: /recent [quantidade 1-30]',
  noGit: 'Não é um repositório git com commits, ou o git não responde.',
  none: 'Nenhuma alteração de arquivo no histórico recente.',
  more: count => `… mais ${count} não mostrados`,
}

const es: Strings = {
  command: 'Lista los archivos cambiados más recientemente, con cuándo, en los últimos 100 commits',
  hint: '[cantidad]',
  usage: 'Uso: /recent [cantidad 1-30]',
  noGit: 'No es un repositorio git con commits, o git no responde.',
  none: 'Ningún cambio de archivo en el historial reciente.',
  more: count => `… ${count} más no mostrados`,
}

export const STRINGS = { en, pt, es }
