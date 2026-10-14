const en = {
  command: 'Find where a function, class, type or variable is defined in the tracked files',
  hint: '<name>',
  usage: 'Usage: /def <name> (letters, digits and _)',
  noGit: 'Not a git repository, or git is not responding.',
  none: (name: string) => `No definition of ${name} found.`,
  more: (count: number) => `… ${count} more not shown`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Acha onde uma função, classe, tipo ou variável é definida nos arquivos versionados',
  hint: '<nome>',
  usage: 'Uso: /def <nome> (letras, dígitos e _)',
  noGit: 'Não é um repositório git, ou o git não responde.',
  none: name => `Nenhuma definição de ${name} encontrada.`,
  more: count => `… mais ${count} não mostrados`,
}

const es: Strings = {
  command: 'Encuentra dónde se define una función, clase, tipo o variable en los archivos versionados',
  hint: '<nombre>',
  usage: 'Uso: /def <nombre> (letras, dígitos y _)',
  noGit: 'No es un repositorio git, o git no responde.',
  none: name => `No se encontró ninguna definición de ${name}.`,
  more: count => `… ${count} más no mostrados`,
}

export const STRINGS = { en, pt, es }
