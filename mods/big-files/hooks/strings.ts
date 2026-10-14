const en = {
  command: 'List the largest tracked files of the project',
  hint: '[count]',
  usage: 'Usage: /big [count 1-30]',
  noGit: 'Not a git repository with commits, or git is not responding.',
  none: 'No tracked files.',
  footer: (shown: number, all: number) => `(${shown} of ${all} tracked files)`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Lista os maiores arquivos versionados do projeto',
  hint: '[quantidade]',
  usage: 'Uso: /big [quantidade 1-30]',
  noGit: 'Não é um repositório git com commits, ou o git não responde.',
  none: 'Nenhum arquivo versionado.',
  footer: (shown, all) => `(${shown} de ${all} arquivos versionados)`,
}

const es: Strings = {
  command: 'Lista los archivos versionados más grandes del proyecto',
  hint: '[cantidad]',
  usage: 'Uso: /big [cantidad 1-30]',
  noGit: 'No es un repositorio git con commits, o git no responde.',
  none: 'Ningún archivo versionado.',
  footer: (shown, all) => `(${shown} de ${all} archivos versionados)`,
}

export const STRINGS = { en, pt, es }
