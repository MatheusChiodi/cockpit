const en = {
  told: (detail: string, path: string) => `commented-code-note: commented-out code in ${path}, Claude was told`,
}

type Strings = typeof en

const pt: Strings = {
  told: (detail, path) => `commented-code-note: código comentado em ${path}, o Claude foi avisado`,
}

const es: Strings = {
  told: (detail, path) => `commented-code-note: código comentado en ${path}, se avisó a Claude`,
}

export const STRINGS = { en, pt, es }
