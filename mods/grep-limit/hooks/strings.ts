const en = {
  capped: (lines: number) => `grep-limit: Grep cut at ${lines} lines, Claude was told to narrow it`,
}

type Strings = typeof en

const pt: Strings = {
  capped: lines => `grep-limit: Grep cortado em ${lines} linhas, Claude foi avisado para estreitar a busca`,
}

const es: Strings = {
  capped: lines => `grep-limit: Grep cortado en ${lines} líneas, se avisó a Claude que acote la búsqueda`,
}

export const STRINGS = { en, pt, es }
