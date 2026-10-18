const en = {
  command: 'Shows what this project has cost across all sessions',
  none: 'No cost recorded for this project yet.',
  head: (usd: string, sessions: number) => `Project spend: US$ ${usd} in ${sessions} ${sessions === 1 ? 'session' : 'sessions'}`,
  here: (usd: string) => `This session: US$ ${usd}`,
  before: (usd: string) => `Earlier sessions: US$ ${usd}`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Mostra quanto este projeto custou somando todas as sessões',
  none: 'Nenhum custo registrado para este projeto ainda.',
  head: (usd, sessions) => `Gasto do projeto: US$ ${usd} em ${sessions} ${sessions === 1 ? 'sessão' : 'sessões'}`,
  here: usd => `Esta sessão: US$ ${usd}`,
  before: usd => `Sessões anteriores: US$ ${usd}`,
}

const es: Strings = {
  command: 'Muestra cuánto costó este proyecto sumando todas las sesiones',
  none: 'Aún no hay costo registrado para este proyecto.',
  head: (usd, sessions) => `Gasto del proyecto: US$ ${usd} en ${sessions} ${sessions === 1 ? 'sesión' : 'sesiones'}`,
  here: usd => `Esta sesión: US$ ${usd}`,
  before: usd => `Sesiones anteriores: US$ ${usd}`,
}

export const STRINGS = { en, pt, es }
