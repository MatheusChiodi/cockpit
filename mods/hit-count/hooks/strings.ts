const en = {
  command: 'Count how many times a text appears in each tracked file, most first',
  hint: '<text>',
  usage: 'Usage: /hits <text>',
  noGit: 'Not a git repository, or git is not responding.',
  none: (text: string) => `No match for "${text}".`,
  more: (count: number) => `… ${count} more files not shown`,
  total: (hits: number, files: number) => `${hits} matches in ${files} files`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Conta quantas vezes um texto aparece em cada arquivo versionado, do maior para o menor',
  hint: '<texto>',
  usage: 'Uso: /hits <texto>',
  noGit: 'Não é um repositório git, ou o git não responde.',
  none: text => `Nenhuma ocorrência de "${text}".`,
  more: count => `… mais ${count} arquivos não mostrados`,
  total: (hits, files) => `${hits} ocorrências em ${files} arquivos`,
}

const es: Strings = {
  command: 'Cuenta cuántas veces aparece un texto en cada archivo versionado, de mayor a menor',
  hint: '<texto>',
  usage: 'Uso: /hits <texto>',
  noGit: 'No es un repositorio git, o git no responde.',
  none: text => `Ninguna coincidencia de "${text}".`,
  more: count => `… ${count} archivos más no mostrados`,
  total: (hits, files) => `${hits} coincidencias en ${files} archivos`,
}

export const STRINGS = { en, pt, es }
