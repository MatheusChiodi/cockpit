const en = {
  told: (detail: string, path: string) => `sql-no-where-note: ${detail} in ${path}, Claude was told`,
}

type Strings = typeof en

const pt: Strings = {
  told: (detail, path) => `sql-no-where-note: ${detail} em ${path}, o Claude foi avisado`,
}

const es: Strings = {
  told: (detail, path) => `sql-no-where-note: ${detail} en ${path}, se avisó a Claude`,
}

export const STRINGS = { en, pt, es }
