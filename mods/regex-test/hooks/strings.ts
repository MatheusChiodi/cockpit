const en = {
  command: 'Test a regular expression: matches, positions and capture groups; uses the mouse selection when no text is given',
  hint: '/pattern/flags <text>',
  usage: 'Usage: /re /pattern/flags <text>  e.g. /re /(\\d+)-(\\w+)/g order 12-ab 7-cd',
  noMatch: 'no match',
  matched: (count: number) => `${count} match(es)`,
  more: (count: number) => `... and ${count} more`,
  invalid: (message: string) => `Invalid pattern: ${message}`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Testa uma expressão regular: ocorrências, posições e grupos de captura; usa a seleção do mouse quando não há texto',
  hint: '/padrão/flags <texto>',
  usage: 'Uso: /re /padrão/flags <texto>  ex.: /re /(\\d+)-(\\w+)/g pedido 12-ab 7-cd',
  noMatch: 'sem correspondência',
  matched: count => `${count} ocorrência(s)`,
  more: count => `... e mais ${count}`,
  invalid: message => `Padrão inválido: ${message}`,
}

const es: Strings = {
  command: 'Prueba una expresión regular: coincidencias, posiciones y grupos de captura; usa la selección del ratón cuando no hay texto',
  hint: '/patrón/flags <texto>',
  usage: 'Uso: /re /patrón/flags <texto>  p. ej.: /re /(\\d+)-(\\w+)/g pedido 12-ab 7-cd',
  noMatch: 'sin coincidencias',
  matched: count => `${count} coincidencia(s)`,
  more: count => `... y ${count} más`,
  invalid: message => `Patrón no válido: ${message}`,
}

export const STRINGS = { en, pt, es }
