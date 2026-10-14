const en = {
  command: 'Show who last touched a file or folder, when, and who changed it most',
  hint: '<path>',
  usage: 'Usage: /who <path>',
  outside: (path: string) => `Outside the project: ${path}`,
  noGit: 'Not a git repository, or git is not responding.',
  noHistory: (path: string) => `No commits touch ${path}.`,
  last: 'last',
  authors: 'authors',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Mostra quem mexeu por último em um arquivo ou pasta, quando, e quem mais o alterou',
  hint: '<caminho>',
  usage: 'Uso: /who <caminho>',
  outside: path => `Fora do projeto: ${path}`,
  noGit: 'Não é um repositório git, ou o git não responde.',
  noHistory: path => `Nenhum commit altera ${path}.`,
  last: 'último',
  authors: 'autores',
}

const es: Strings = {
  command: 'Muestra quién tocó por última vez un archivo o carpeta, cuándo, y quién más lo cambió',
  hint: '<ruta>',
  usage: 'Uso: /who <ruta>',
  outside: path => `Fuera del proyecto: ${path}`,
  noGit: 'No es un repositorio git, o git no responde.',
  noHistory: path => `Ningún commit modifica ${path}.`,
  last: 'último',
  authors: 'autores',
}

export const STRINGS = { en, pt, es }
