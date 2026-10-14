const en = {
  nag: (number: number, title: string, days: number, others: number) =>
    `#${number} "${title}" has been a draft for ${days} days. Ready for review?${others > 0 ? ` (+${others} more draft(s))` : ''}`,
}

type Strings = typeof en

const pt: Strings = {
  nag: (number, title, days, others) =>
    `#${number} "${title}" está como rascunho há ${days} dias. Pronto para revisão?${others > 0 ? ` (+${others} rascunho(s))` : ''}`,
}

const es: Strings = {
  nag: (number, title, days, others) =>
    `#${number} "${title}" lleva ${days} días como borrador. ¿Listo para revisión?${others > 0 ? ` (+${others} borrador(es))` : ''}`,
}

export const STRINGS = { en, pt, es }
