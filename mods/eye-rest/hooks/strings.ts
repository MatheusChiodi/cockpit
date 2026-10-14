const en = {
  look: '20-20-20: look at something 20 feet away for 20 seconds.',
}

type Strings = typeof en

const pt: Strings = {
  look: '20-20-20: olhe para algo a 6 metros de distância por 20 segundos.',
}

const es: Strings = {
  look: '20-20-20: mira algo a 6 metros de distancia durante 20 segundos.',
}

export const STRINGS = { en, pt, es }
