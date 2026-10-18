const en = {
  told: (detail: string, path: string) => `magic-number-note: bare number repeated (${detail}) in ${path}, Claude was told`,
}

type Strings = typeof en

const pt: Strings = {
  told: (detail, path) => `magic-number-note: número solto repetido (${detail}) em ${path}, o Claude foi avisado`,
}

const es: Strings = {
  told: (detail, path) => `magic-number-note: número suelto repetido (${detail}) en ${path}, se avisó a Claude`,
}

export const STRINGS = { en, pt, es }
