const en = {
  command: 'List local branches, or switch to one (created when it does not exist)',
  hint: '[name]',
  usage: 'Usage: /gb [name]  (letters, digits, . _ - /)',
  noGit: 'git not found or not a repository.',
  none: 'No local branches.',
  switched: (name: string) => `Switched to ${name}.`,
  created: (name: string) => `Created and switched to ${name}.`,
  failed: (reason: string) => `git refused: ${reason}`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Lista as branches locais ou troca para uma (criada se não existir)',
  hint: '[nome]',
  usage: 'Uso: /gb [nome]  (letras, dígitos, . _ - /)',
  noGit: 'git não encontrado ou não é um repositório.',
  none: 'Nenhuma branch local.',
  switched: name => `Trocou para ${name}.`,
  created: name => `Criou e trocou para ${name}.`,
  failed: reason => `git recusou: ${reason}`,
}

const es: Strings = {
  command: 'Lista las ramas locales o cambia a una (se crea si no existe)',
  hint: '[nombre]',
  usage: 'Uso: /gb [nombre]  (letras, dígitos, . _ - /)',
  noGit: 'git no encontrado o no es un repositorio.',
  none: 'No hay ramas locales.',
  switched: name => `Cambió a ${name}.`,
  created: name => `Creó y cambió a ${name}.`,
  failed: reason => `git rechazó: ${reason}`,
}

export const STRINGS = { en, pt, es }
