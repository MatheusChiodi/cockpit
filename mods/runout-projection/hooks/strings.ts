const en = {
  command: 'Projects when each rate-limit window runs out at the current pace',
  none: 'No rate-limit window reported (not on a subscription, or no response yet).',
  windows: { five_hour: '5h window', seven_day: '7-day window', spend_limit: 'spend limit' } as Record<string, string>,
  waiting: (label: string, percent: number) => `${label}: ${percent}%, not enough pace data yet`,
  lasts: (label: string, percent: number) => `${label}: ${percent}%, lasts until it resets at this pace`,
  runs: (label: string, percent: number, left: string, reset: string) => `${label}: ${percent}%, runs out in ${left}${reset}`,
  reset: (left: string) => `, resets in ${left}`,
  toast: (label: string, percent: number, left: string, reset: string) => `${label} at ${percent}%: at this pace it runs out in ${left}${reset}`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Projeta quando cada janela de limite acaba no ritmo atual',
  none: 'Nenhuma janela de limite informada (fora de assinatura, ou sem resposta ainda).',
  windows: { five_hour: 'janela de 5h', seven_day: 'janela de 7 dias', spend_limit: 'limite de gasto' },
  waiting: (label, percent) => `${label}: ${percent}%, ainda sem dados de ritmo`,
  lasts: (label, percent) => `${label}: ${percent}%, dura até renovar nesse ritmo`,
  runs: (label, percent, left, reset) => `${label}: ${percent}%, acaba em ${left}${reset}`,
  reset: left => `, renova em ${left}`,
  toast: (label, percent, left, reset) => `${label} em ${percent}%: nesse ritmo acaba em ${left}${reset}`,
}

const es: Strings = {
  command: 'Proyecta cuándo se agota cada ventana de límite al ritmo actual',
  none: 'Ninguna ventana de límite informada (fuera de una suscripción, o sin respuesta aún).',
  windows: { five_hour: 'ventana de 5h', seven_day: 'ventana de 7 días', spend_limit: 'límite de gasto' },
  waiting: (label, percent) => `${label}: ${percent}%, aún sin datos de ritmo`,
  lasts: (label, percent) => `${label}: ${percent}%, dura hasta renovarse a este ritmo`,
  runs: (label, percent, left, reset) => `${label}: ${percent}%, se agota en ${left}${reset}`,
  reset: left => `, se renueva en ${left}`,
  toast: (label, percent, left, reset) => `${label} al ${percent}%: a este ritmo se agota en ${left}${reset}`,
}

export const STRINGS = { en, pt, es }
