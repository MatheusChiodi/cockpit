const en = {
  folded: (count: number) => `… ${count} lines folded`,
}

type Strings = typeof en

const pt: Strings = {
  folded: count => `… ${count} linhas dobradas`,
}

const es: Strings = {
  folded: count => `… ${count} líneas plegadas`,
}

export const STRINGS = { en, pt, es }
