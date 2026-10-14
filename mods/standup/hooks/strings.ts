const en = {
  command: 'Your commits since yesterday morning in this repository, grouped by day and ready to paste',
  today: 'today',
  yesterday: 'yesterday',
  copied: 'Copied to the clipboard.',
  none: (since: string) => `No commits of yours since ${since}.`,
  noEmail: 'git has no user.email set: run git config user.email you@example.com.',
  notRepo: (message: string) => `Could not read the git history: ${message}`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Seus commits desde ontem de manhã neste repositório, agrupados por dia e prontos para colar',
  today: 'hoje',
  yesterday: 'ontem',
  copied: 'Copiado para a área de transferência.',
  none: since => `Nenhum commit seu desde ${since}.`,
  noEmail: 'O git não tem user.email definido: rode git config user.email voce@exemplo.com.',
  notRepo: message => `Não foi possível ler o histórico do git: ${message}`,
}

const es: Strings = {
  command: 'Tus commits desde ayer por la mañana en este repositorio, agrupados por día y listos para pegar',
  today: 'hoy',
  yesterday: 'ayer',
  copied: 'Copiado al portapapeles.',
  none: since => `Ningún commit tuyo desde ${since}.`,
  noEmail: 'git no tiene user.email definido: ejecuta git config user.email tu@ejemplo.com.',
  notRepo: message => `No se pudo leer el historial de git: ${message}`,
}

export const STRINGS = { en, pt, es }
