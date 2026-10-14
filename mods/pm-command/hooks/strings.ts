const en = {
  command: "Names the project's package manager and shows its install, add, remove, run and exec commands",
  noPackage: 'pm: no package.json in this folder.',
  none: 'npm (no lockfile and no packageManager field: npm is the default)',
  conflict: (files: string) => `pm: several lockfiles (${files}). Keep one, or set packageManager in package.json.`,
  labels: { install: 'install', add: 'add', remove: 'remove', run: 'run', exec: 'exec', once: 'one-off' },
}

type Strings = typeof en

const pt: Strings = {
  command: 'Informa o gerenciador de pacotes do projeto e mostra seus comandos de install, add, remove, run e exec',
  noPackage: 'pm: não há package.json nesta pasta.',
  none: 'npm (sem lockfile e sem campo packageManager: npm é o padrão)',
  conflict: files => `pm: vários lockfiles (${files}). Mantenha um, ou defina packageManager no package.json.`,
  labels: { install: 'instalar', add: 'adicionar', remove: 'remover', run: 'rodar', exec: 'executar', once: 'avulso' },
}

const es: Strings = {
  command: 'Indica el gestor de paquetes del proyecto y muestra sus comandos de install, add, remove, run y exec',
  noPackage: 'pm: no hay package.json en esta carpeta.',
  none: 'npm (sin lockfile y sin campo packageManager: npm es el predeterminado)',
  conflict: files => `pm: varios lockfiles (${files}). Deja uno, o define packageManager en package.json.`,
  labels: { install: 'instalar', add: 'agregar', remove: 'quitar', run: 'ejecutar', exec: 'exec', once: 'puntual' },
}

export const STRINGS = { en, pt, es }
