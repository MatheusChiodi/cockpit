const en = {
  told: (detail: string, path: string) => `unused-import-note: unused import ${detail} in ${path}, Claude was told`,
}

type Strings = typeof en

const pt: Strings = {
  told: (detail, path) => `unused-import-note: import sem uso ${detail} em ${path}, o Claude foi avisado`,
}

const es: Strings = {
  told: (detail, path) => `unused-import-note: import sin uso ${detail} en ${path}, se avisó a Claude`,
}

export const STRINGS = { en, pt, es }
