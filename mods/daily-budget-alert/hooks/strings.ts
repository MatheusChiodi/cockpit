const en = {
  title: 'Claude Code',
  command: 'Set a budget in US dollars for the day across sessions; /daybudget off removes it',
  hint: '<usd> | off',
  usage: 'Usage: /daybudget <usd> | off',
  set: (usd: string, today: string) => `Daily budget set to $${usd} (today: $${today}).`,
  off: 'Daily budget removed.',
  current: (usd: string, today: string) => `Daily budget: $${usd} (today: $${today}).`,
  none: 'No daily budget. Set one with /daybudget <usd>.',
  over: (total: string, limit: string) => `Daily budget passed: $${total} of $${limit}.`,
}

type Strings = typeof en

const pt: Strings = {
  title: 'Claude Code',
  command: 'Define um orçamento em dólares para o dia somando as sessões; /daybudget off remove',
  hint: '<usd> | off',
  usage: 'Uso: /daybudget <usd> | off',
  set: (usd, today) => `Orçamento do dia definido em US$ ${usd} (hoje: US$ ${today}).`,
  off: 'Orçamento do dia removido.',
  current: (usd, today) => `Orçamento do dia: US$ ${usd} (hoje: US$ ${today}).`,
  none: 'Sem orçamento do dia. Defina com /daybudget <usd>.',
  over: (total, limit) => `Orçamento do dia ultrapassado: US$ ${total} de US$ ${limit}.`,
}

const es: Strings = {
  title: 'Claude Code',
  command: 'Fija un presupuesto en dólares para el día sumando las sesiones; /daybudget off lo quita',
  hint: '<usd> | off',
  usage: 'Uso: /daybudget <usd> | off',
  set: (usd, today) => `Presupuesto del día fijado en US$ ${usd} (hoy: US$ ${today}).`,
  off: 'Presupuesto del día quitado.',
  current: (usd, today) => `Presupuesto del día: US$ ${usd} (hoy: US$ ${today}).`,
  none: 'Sin presupuesto del día. Fíjalo con /daybudget <usd>.',
  over: (total, limit) => `Presupuesto del día superado: US$ ${total} de US$ ${limit}.`,
}

export const STRINGS = { en, pt, es }
