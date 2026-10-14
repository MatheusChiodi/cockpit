const en = {
  command: 'Show how one project file differs from another',
  hint: '<file-a> <file-b>',
  usage: 'Usage: /cmp <file-a> <file-b>',
  outside: (path: string) => `Outside the project: ${path}`,
  secret: (path: string) => `${path} may hold secrets: not compared.`,
  missing: (path: string) => `Not found: ${path}`,
  noGit: 'git is not responding.',
  same: (a: string, b: string) => `${a} and ${b} are identical.`,
  more: (count: number) => `… ${count} more lines not shown`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Mostra como um arquivo do projeto difere de outro',
  hint: '<arquivo-a> <arquivo-b>',
  usage: 'Uso: /cmp <arquivo-a> <arquivo-b>',
  outside: path => `Fora do projeto: ${path}`,
  secret: path => `${path} pode guardar segredos: não comparado.`,
  missing: path => `Não encontrado: ${path}`,
  noGit: 'O git não responde.',
  same: (a, b) => `${a} e ${b} são idênticos.`,
  more: count => `… mais ${count} linhas não mostradas`,
}

const es: Strings = {
  command: 'Muestra en qué se diferencia un archivo del proyecto de otro',
  hint: '<archivo-a> <archivo-b>',
  usage: 'Uso: /cmp <archivo-a> <archivo-b>',
  outside: path => `Fuera del proyecto: ${path}`,
  secret: path => `${path} puede guardar secretos: no comparado.`,
  missing: path => `No encontrado: ${path}`,
  noGit: 'git no responde.',
  same: (a, b) => `${a} y ${b} son idénticos.`,
  more: count => `… ${count} líneas más no mostradas`,
}

export const STRINGS = { en, pt, es }
