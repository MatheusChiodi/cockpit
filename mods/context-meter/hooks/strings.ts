const en = {
  label: 'ctx',
  cost: (usd: string) => ` · $${usd}`,
  warn: (percent: number) => `Context at ${percent}%. Consider /compact or /clear.`,
}

type Strings = typeof en

const pt: Strings = {
  label: 'ctx',
  cost: usd => ` · US$ ${usd}`,
  warn: percent => `Contexto em ${percent}%. Considere /compact ou /clear.`,
}

const es: Strings = {
  label: 'ctx',
  cost: usd => ` · US$ ${usd}`,
  warn: percent => `Contexto al ${percent}%. Considera /compact o /clear.`,
}

export const STRINGS = { en, pt, es }
