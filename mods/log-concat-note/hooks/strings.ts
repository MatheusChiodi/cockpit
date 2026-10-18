const en = {
  told: (detail: string, path: string) => `log-concat-note: ${detail} in ${path}, Claude was told`,
}

type Strings = typeof en

const pt: Strings = {
  told: (detail, path) => `log-concat-note: ${detail} em ${path}, o Claude foi avisado`,
}

const es: Strings = {
  told: (detail, path) => `log-concat-note: ${detail} en ${path}, se avisó a Claude`,
}

export const STRINGS = { en, pt, es }
