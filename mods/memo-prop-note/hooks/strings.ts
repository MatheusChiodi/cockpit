const en = {
  told: (detail: string, path: string) => `memo-prop-note: ${detail} defeats memo in ${path}, Claude was told`,
}

type Strings = typeof en

const pt: Strings = {
  told: (detail, path) => `memo-prop-note: ${detail} anula o memo em ${path}, o Claude foi avisado`,
}

const es: Strings = {
  told: (detail, path) => `memo-prop-note: ${detail} anula el memo en ${path}, se avisó a Claude`,
}

export const STRINGS = { en, pt, es }
