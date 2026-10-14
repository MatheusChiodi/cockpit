const en = {
  command: 'Tell whether git ignores a path and which rule does it',
  hint: '<path>',
  usage: 'Usage: /ignored <path>',
  outside: (path: string) => `Outside the project: ${path}`,
  noGit: 'Not a git repository, or git is not responding.',
  notIgnored: (path: string) => `${path} is not ignored.`,
  ignored: (path: string, pattern: string, source: string, line: string) =>
    `${path} is ignored by "${pattern}" (${source}:${line})`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Diz se o git ignora um caminho e qual regra faz isso',
  hint: '<caminho>',
  usage: 'Uso: /ignored <caminho>',
  outside: path => `Fora do projeto: ${path}`,
  noGit: 'Não é um repositório git, ou o git não responde.',
  notIgnored: path => `${path} não é ignorado.`,
  ignored: (path, pattern, source, line) => `${path} é ignorado por "${pattern}" (${source}:${line})`,
}

const es: Strings = {
  command: 'Dice si git ignora una ruta y qué regla lo hace',
  hint: '<ruta>',
  usage: 'Uso: /ignored <ruta>',
  outside: path => `Fuera del proyecto: ${path}`,
  noGit: 'No es un repositorio git, o git no responde.',
  notIgnored: path => `${path} no es ignorado.`,
  ignored: (path, pattern, source, line) => `${path} es ignorado por "${pattern}" (${source}:${line})`,
}

export const STRINGS = { en, pt, es }
