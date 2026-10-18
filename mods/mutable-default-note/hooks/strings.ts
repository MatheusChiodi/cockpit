const en = {
  told: (detail: string, path: string) => `mutable-default-note: mutable default (${detail}) in ${path}, Claude was told`,
}

type Strings = typeof en

const pt: Strings = {
  told: (detail, path) => `mutable-default-note: padrão mutável (${detail}) em ${path}, o Claude foi avisado`,
}

const es: Strings = {
  told: (detail, path) => `mutable-default-note: valor mutable por defecto (${detail}) en ${path}, se avisó a Claude`,
}

export const STRINGS = { en, pt, es }
