const en = {
  command: 'Show how big a file is (bytes and lines) or a folder (tracked size and files)',
  hint: '[path]',
  outside: (path: string) => `Outside the project: ${path}`,
  missing: (path: string) => `Not found: ${path}`,
  noGit: 'Not a git repository with commits, or git is not responding.',
  none: (path: string) => `No tracked files in ${path}.`,
  size: 'size',
  lines: 'lines',
  files: 'files',
  biggest: 'biggest',
  tracked: '(tracked)',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Mostra o tamanho de um arquivo (bytes e linhas) ou de uma pasta (tamanho versionado e arquivos)',
  hint: '[caminho]',
  outside: path => `Fora do projeto: ${path}`,
  missing: path => `Não encontrado: ${path}`,
  noGit: 'Não é um repositório git com commits, ou o git não responde.',
  none: path => `Nenhum arquivo versionado em ${path}.`,
  size: 'tamanho',
  lines: 'linhas',
  files: 'arquivos',
  biggest: 'maior',
  tracked: '(versionado)',
}

const es: Strings = {
  command: 'Muestra el tamaño de un archivo (bytes y líneas) o de una carpeta (tamaño versionado y archivos)',
  hint: '[ruta]',
  outside: path => `Fuera del proyecto: ${path}`,
  missing: path => `No encontrado: ${path}`,
  noGit: 'No es un repositorio git con commits, o git no responde.',
  none: path => `Ningún archivo versionado en ${path}.`,
  size: 'tamaño',
  lines: 'líneas',
  files: 'archivos',
  biggest: 'mayor',
  tracked: '(versionado)',
}

export const STRINGS = { en, pt, es }
