const en = {
  command: 'List the tracked files whose path contains a text, best matches first',
  hint: '<name>',
  usage: 'Usage: /ff <name>',
  noGit: 'git not found or not a repository.',
  none: (text: string) => `No tracked file matches "${text}".`,
  total: (count: number) => (count === 1 ? '1 file' : `${count} files`),
  capped: (shown: number, count: number) => `${shown} of ${count} files`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Lista os arquivos versionados cujo caminho contém um texto, os melhores primeiro',
  hint: '<nome>',
  usage: 'Uso: /ff <nome>',
  noGit: 'git não encontrado ou não é um repositório.',
  none: text => `Nenhum arquivo versionado combina com "${text}".`,
  total: count => (count === 1 ? '1 arquivo' : `${count} arquivos`),
  capped: (shown, count) => `${shown} de ${count} arquivos`,
}

const es: Strings = {
  command: 'Lista los archivos versionados cuya ruta contiene un texto, los mejores primero',
  hint: '<nombre>',
  usage: 'Uso: /ff <nombre>',
  noGit: 'git no encontrado o no es un repositorio.',
  none: text => `Ningún archivo versionado coincide con "${text}".`,
  total: count => (count === 1 ? '1 archivo' : `${count} archivos`),
  capped: (shown, count) => `${shown} de ${count} archivos`,
}

export const STRINGS = { en, pt, es }
