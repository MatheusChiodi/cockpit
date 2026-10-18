const en = {
  told: (detail: string, path: string) => `param-count-note: ${detail} in ${path}, Claude was told`,
}

type Strings = typeof en

const pt: Strings = {
  told: (detail, path) => `param-count-note: ${detail} em ${path}, o Claude foi avisado`,
}

const es: Strings = {
  told: (detail, path) => `param-count-note: ${detail} en ${path}, se avisó a Claude`,
}

export const STRINGS = { en, pt, es }
