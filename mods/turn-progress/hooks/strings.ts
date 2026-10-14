const en = {
  label: 'turn',
  tools: (n: number) => `${n} tool${n === 1 ? '' : 's'}`,
}

type Strings = typeof en

const pt: Strings = {
  label: 'turno',
  tools: (n: number) => `${n} tool${n === 1 ? '' : 's'}`,
}

const es: Strings = {
  label: 'turno',
  tools: (n: number) => `${n} herramienta${n === 1 ? '' : 's'}`,
}

export const STRINGS = { en, pt, es }
