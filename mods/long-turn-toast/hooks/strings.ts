const en = {
  long: (took: string, usual: string) => `This turn took ${took}, usually about ${usual}. Still on track?`,
}

type Strings = typeof en

const pt: Strings = {
  long: (took, usual) => `Este turno levou ${took}, em geral cerca de ${usual}. Ainda no rumo?`,
}

const es: Strings = {
  long: (took, usual) => `Este turno tardó ${took}, normalmente unos ${usual}. ¿Sigue en rumbo?`,
}

export const STRINGS = { en, pt, es }
