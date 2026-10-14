const en = {
  label: 'reminder',
  command: (max: number) => `Pins up to ${max} reminders above the prompt: /pin <text>, /pin rm <n>, /pin clear`,
  hint: '<text> | rm <n> | clear',
  usage: 'Usage: /pin <text> | rm <n> | clear',
  cleared: 'Reminders removed.',
  missing: (value: string) => `No such reminder: ${value}`,
  removed: (n: number) => `Reminder ${n} removed.`,
  full: (max: number) => `Limit of ${max} reminders. Remove one with /pin rm <n>.`,
  pinned: (n: number) => `Reminder ${n} pinned.`,
}

type Strings = typeof en

const pt: Strings = {
  label: 'lembrete',
  command: max => `Fixa até ${max} lembretes acima do prompt: /pin <texto>, /pin rm <n>, /pin clear`,
  hint: '<texto> | rm <n> | clear',
  usage: 'Uso: /pin <texto> | rm <n> | clear',
  cleared: 'Lembretes removidos.',
  missing: value => `Lembrete inexistente: ${value}`,
  removed: n => `Lembrete ${n} removido.`,
  full: max => `Limite de ${max} lembretes. Remova um com /pin rm <n>.`,
  pinned: n => `Lembrete ${n} fixado.`,
}

const es: Strings = {
  label: 'aviso',
  command: max => `Fija hasta ${max} recordatorios sobre el prompt: /pin <texto>, /pin rm <n>, /pin clear`,
  hint: '<texto> | rm <n> | clear',
  usage: 'Uso: /pin <texto> | rm <n> | clear',
  cleared: 'Recordatorios eliminados.',
  missing: value => `El recordatorio no existe: ${value}`,
  removed: n => `Recordatorio ${n} eliminado.`,
  full: max => `Límite de ${max} recordatorios. Elimina uno con /pin rm <n>.`,
  pinned: n => `Recordatorio ${n} fijado.`,
}

export const STRINGS = { en, pt, es }
