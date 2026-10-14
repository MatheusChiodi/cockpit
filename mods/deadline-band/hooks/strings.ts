const en = {
  label: 'deadline',
  locale: 'en-US',
  command: 'Pinned countdown to a project deadline; /deadline clear removes it',
  hint: 'YYYY-MM-DD [HH:MM] <description> | clear',
  usage: 'Usage: /deadline YYYY-MM-DD [HH:MM] <description> | clear',
  removed: 'Deadline removed.',
  defaultLabel: 'deadline',
  set: (label: string, when: string) => `Deadline "${label}" set for ${when}.`,
  inSpan: (span: string) => `in ${span}`,
  overdue: (span: string) => `overdue ${span}`,
}

type Strings = typeof en

const pt: Strings = {
  label: 'prazo',
  locale: 'pt-BR',
  command: 'Contagem regressiva fixa para um prazo do projeto; /deadline clear remove',
  hint: 'AAAA-MM-DD [HH:MM] <descrição> | clear',
  usage: 'Uso: /deadline AAAA-MM-DD [HH:MM] <descrição> | clear',
  removed: 'Prazo removido.',
  defaultLabel: 'prazo',
  set: (label, when) => `Prazo "${label}" fixado para ${when}.`,
  inSpan: span => `em ${span}`,
  overdue: span => `atrasado ${span}`,
}

const es: Strings = {
  label: 'plazo',
  locale: 'es-ES',
  command: 'Cuenta regresiva fija para un plazo del proyecto; /deadline clear lo quita',
  hint: 'AAAA-MM-DD [HH:MM] <descripción> | clear',
  usage: 'Uso: /deadline AAAA-MM-DD [HH:MM] <descripción> | clear',
  removed: 'Plazo eliminado.',
  defaultLabel: 'plazo',
  set: (label, when) => `Plazo "${label}" fijado para ${when}.`,
  inSpan: span => `en ${span}`,
  overdue: span => `vencido hace ${span}`,
}

export const STRINGS = { en, pt, es }
