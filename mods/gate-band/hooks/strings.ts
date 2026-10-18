const en = {
  label: 'gate',
  denied: (count: number) => `${count} denied`,
  asked: (count: number) => `${count} asked`,
  tail: 'this turn',
}

type Strings = typeof en

const pt: Strings = {
  label: 'portão',
  denied: count => `${count} negadas`,
  asked: count => `${count} perguntadas`,
  tail: 'neste turno',
}

const es: Strings = {
  label: 'puerta',
  denied: count => `${count} denegadas`,
  asked: count => `${count} preguntadas`,
  tail: 'en este turno',
}

export const STRINGS = { en, pt, es }
