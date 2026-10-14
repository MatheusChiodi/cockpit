const en = {
  command: 'Count lines of code by file type for the project or a path',
  hint: '[path]',
  outside: (path: string) => `Outside the project: ${path}`,
  noGit: 'Not a git repository, or git is not responding.',
  none: (path: string) => `No readable tracked files in ${path}.`,
  files: 'files',
  lines: 'lines',
  total: 'total',
  other: 'other',
  sampled: (shown: number, all: number) => `(counted the first ${shown} of ${all} files)`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Conta linhas de código por tipo de arquivo no projeto ou em um caminho',
  hint: '[caminho]',
  outside: path => `Fora do projeto: ${path}`,
  noGit: 'Não é um repositório git, ou o git não responde.',
  none: path => `Nenhum arquivo versionado legível em ${path}.`,
  files: 'arquivos',
  lines: 'linhas',
  total: 'total',
  other: 'outros',
  sampled: (shown, all) => `(contou os primeiros ${shown} de ${all} arquivos)`,
}

const es: Strings = {
  command: 'Cuenta líneas de código por tipo de archivo en el proyecto o en una ruta',
  hint: '[ruta]',
  outside: path => `Fuera del proyecto: ${path}`,
  noGit: 'No es un repositorio git, o git no responde.',
  none: path => `Ningún archivo versionado legible en ${path}.`,
  files: 'archivos',
  lines: 'líneas',
  total: 'total',
  other: 'otros',
  sampled: (shown, all) => `(contó los primeros ${shown} de ${all} archivos)`,
}

export const STRINGS = { en, pt, es }
