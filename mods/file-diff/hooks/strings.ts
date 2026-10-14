const en = {
  command: 'Show what changed in one file since the last commit',
  hint: '<path>',
  usage: 'Usage: /fdiff <path>',
  outside: (path: string) => `Outside the project: ${path}`,
  secret: (path: string) => `${path} may hold secrets: diff not printed.`,
  noGit: 'Not a git repository with commits, or git is not responding.',
  clean: (path: string) => `No changes in ${path} since the last commit.`,
  more: (count: number) => `… ${count} more lines not shown`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Mostra o que mudou em um arquivo desde o último commit',
  hint: '<caminho>',
  usage: 'Uso: /fdiff <caminho>',
  outside: path => `Fora do projeto: ${path}`,
  secret: path => `${path} pode guardar segredos: diff não exibido.`,
  noGit: 'Não é um repositório git com commits, ou o git não responde.',
  clean: path => `Sem mudanças em ${path} desde o último commit.`,
  more: count => `… mais ${count} linhas não mostradas`,
}

const es: Strings = {
  command: 'Muestra qué cambió en un archivo desde el último commit',
  hint: '<ruta>',
  usage: 'Uso: /fdiff <ruta>',
  outside: path => `Fuera del proyecto: ${path}`,
  secret: path => `${path} puede guardar secretos: diff no mostrado.`,
  noGit: 'No es un repositorio git con commits, o git no responde.',
  clean: path => `Sin cambios en ${path} desde el último commit.`,
  more: count => `… ${count} líneas más no mostradas`,
}

export const STRINGS = { en, pt, es }
