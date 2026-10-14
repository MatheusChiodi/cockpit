const en = {
  title: 'Claude Code',
  command: 'Set a session budget in US dollars; /budget off removes it',
  hint: '<usd> | off',
  usage: 'Usage: /budget <usd> | off',
  set: (usd: string) => `Session budget set to $${usd}.`,
  off: 'Session budget removed.',
  current: (usd: string) => `Session budget: $${usd}.`,
  none: 'No session budget. Set one with /budget <usd>.',
  warn: (cost: string, limit: string) => `Budget: $${cost} of $${limit} (80%)`,
  over: (cost: string, limit: string) => `Session budget passed: $${cost} of $${limit}.`,
}

type Strings = typeof en

const pt: Strings = {
  title: 'Claude Code',
  command: 'Define um orçamento da sessão em dólares; /budget off remove',
  hint: '<usd> | off',
  usage: 'Uso: /budget <usd> | off',
  set: usd => `Orçamento da sessão definido em US$ ${usd}.`,
  off: 'Orçamento da sessão removido.',
  current: usd => `Orçamento da sessão: US$ ${usd}.`,
  none: 'Sem orçamento na sessão. Defina com /budget <usd>.',
  warn: (cost, limit) => `Orçamento: US$ ${cost} de US$ ${limit} (80%)`,
  over: (cost, limit) => `Orçamento da sessão ultrapassado: US$ ${cost} de US$ ${limit}.`,
}

const es: Strings = {
  title: 'Claude Code',
  command: 'Fija un presupuesto de la sesión en dólares; /budget off lo quita',
  hint: '<usd> | off',
  usage: 'Uso: /budget <usd> | off',
  set: usd => `Presupuesto de la sesión fijado en US$ ${usd}.`,
  off: 'Presupuesto de la sesión quitado.',
  current: usd => `Presupuesto de la sesión: US$ ${usd}.`,
  none: 'Sin presupuesto en la sesión. Fíjalo con /budget <usd>.',
  warn: (cost, limit) => `Presupuesto: US$ ${cost} de US$ ${limit} (80%)`,
  over: (cost, limit) => `Presupuesto de la sesión superado: US$ ${cost} de US$ ${limit}.`,
}

export const STRINGS = { en, pt, es }
