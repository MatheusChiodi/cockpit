const en = {
  label: 'deps',
  behind: (count: number) => `${count} behind`,
}

type Strings = typeof en

const pt: Strings = {
  label: 'deps',
  behind: (count: number) => `${count} atrás`,
}

const es: Strings = {
  label: 'deps',
  behind: (count: number) => `${count} atrasadas`,
}

export const STRINGS = { en, pt, es }
