const en = {
  told: (detail: string, path: string) => `vague-name-note: placeholder export ${detail} in ${path}, Claude was told`,
}

type Strings = typeof en

const pt: Strings = {
  told: (detail, path) => `vague-name-note: export provisório ${detail} em ${path}, o Claude foi avisado`,
}

const es: Strings = {
  told: (detail, path) => `vague-name-note: export provisional ${detail} en ${path}, se avisó a Claude`,
}

export const STRINGS = { en, pt, es }
