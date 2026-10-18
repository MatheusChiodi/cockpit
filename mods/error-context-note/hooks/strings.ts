const en = {
  told: (detail: string, path: string) => `error-context-note: error without context (${detail}) in ${path}, Claude was told`,
}

type Strings = typeof en

const pt: Strings = {
  told: (detail, path) => `error-context-note: erro sem contexto (${detail}) em ${path}, o Claude foi avisado`,
}

const es: Strings = {
  told: (detail, path) => `error-context-note: error sin contexto (${detail}) en ${path}, se avisó a Claude`,
}

export const STRINGS = { en, pt, es }
