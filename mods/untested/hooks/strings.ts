const en = {
  command: 'List the changed files that have no test file',
  noGit: 'Not a git repository, or git is not available.',
  noChanges: 'No changed code files.',
  covered: (count: number) => `Every changed code file (${count}) has a test.`,
  header: (count: number) => `Changed code without a test (${count})`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Lista os arquivos alterados que não têm arquivo de teste',
  noGit: 'Não é um repositório git, ou o git não está disponível.',
  noChanges: 'Nenhum arquivo de código alterado.',
  covered: count => `Todo arquivo de código alterado (${count}) tem teste.`,
  header: count => `Código alterado sem teste (${count})`,
}

const es: Strings = {
  command: 'Lista los archivos modificados que no tienen archivo de test',
  noGit: 'No es un repositorio git, o git no está disponible.',
  noChanges: 'Ningún archivo de código modificado.',
  covered: count => `Todos los archivos de código modificados (${count}) tienen test.`,
  header: count => `Código modificado sin test (${count})`,
}

export const STRINGS = { en, pt, es }
