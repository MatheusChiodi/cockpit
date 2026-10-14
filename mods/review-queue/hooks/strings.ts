const en = {
  label: 'reviews',
  incoming: (number: number, title: string) => `Review requested on #${number}: ${title}`,
}

type Strings = typeof en

const pt: Strings = {
  label: 'revisões',
  incoming: (number, title) => `Revisão pedida em #${number}: ${title}`,
}

const es: Strings = {
  label: 'revisiones',
  incoming: (number, title) => `Revisión pedida en #${number}: ${title}`,
}

export const STRINGS = { en, pt, es }
