const en = {
  command: 'One-off reminder: a toast and a notification after that many minutes',
  hint: '<minutes> <text>',
  usage: (max: number) => `Usage: /remind <minutes, 1 to ${max}> <text>`,
  full: (max: number) => `Limit of ${max} pending reminders reached.`,
  set: (minutes: number, text: string) => `I will remind you in ${minutes} min: ${text}`,
  ring: (text: string) => text,
  title: 'Reminder',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Lembrete avulso: toast e notificação depois desse tempo',
  hint: '<minutos> <texto>',
  usage: max => `Uso: /remind <minutos, de 1 a ${max}> <texto>`,
  full: max => `Limite de ${max} lembretes pendentes atingido.`,
  set: (minutes, text) => `Aviso em ${minutes} min: ${text}`,
  ring: text => text,
  title: 'Lembrete',
}

const es: Strings = {
  command: 'Recordatorio puntual: toast y notificación pasado ese tiempo',
  hint: '<minutos> <texto>',
  usage: max => `Uso: /remind <minutos, de 1 a ${max}> <texto>`,
  full: max => `Límite de ${max} recordatorios pendientes alcanzado.`,
  set: (minutes, text) => `Te aviso en ${minutes} min: ${text}`,
  ring: text => text,
  title: 'Recordatorio',
}

export const STRINGS = { en, pt, es }
