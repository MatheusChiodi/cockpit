const en = {
  label: 'guards',
  blocks: (n: number) => `${n} block${n === 1 ? '' : 's'}`,
}

type Strings = typeof en

const pt: Strings = {
  label: 'guards',
  blocks: (n: number) => `${n} bloqueio${n === 1 ? '' : 's'}`,
}

const es: Strings = {
  label: 'guards',
  blocks: (n: number) => `${n} bloqueo${n === 1 ? '' : 's'}`,
}

export const STRINGS = { en, pt, es }
