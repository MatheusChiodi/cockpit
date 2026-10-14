const en = {
  recap: (days: number, sessions: number, prompts: number) =>
    `Last week: ${days} ${days === 1 ? 'day' : 'days'} active, ${sessions} ${sessions === 1 ? 'session' : 'sessions'}, ${prompts} ${prompts === 1 ? 'prompt' : 'prompts'}`,
}

type Strings = typeof en

const pt: Strings = {
  recap: (days, sessions, prompts) =>
    `Semana passada: ${days} ${days === 1 ? 'dia ativo' : 'dias ativos'}, ${sessions} ${sessions === 1 ? 'sessão' : 'sessões'}, ${prompts} ${prompts === 1 ? 'prompt' : 'prompts'}`,
}

const es: Strings = {
  recap: (days, sessions, prompts) =>
    `Semana pasada: ${days} ${days === 1 ? 'día activo' : 'días activos'}, ${sessions} ${sessions === 1 ? 'sesión' : 'sesiones'}, ${prompts} ${prompts === 1 ? 'prompt' : 'prompts'}`,
}

export const STRINGS = { en, pt, es }
