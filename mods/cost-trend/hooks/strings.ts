const en = {
  label: (turns: number) => `last ${turns}`,
}

type Strings = typeof en

const pt: Strings = {
  label: turns => `últimos ${turns}`,
}

const es: Strings = {
  label: turns => `últimos ${turns}`,
}

export const STRINGS = { en, pt, es }
