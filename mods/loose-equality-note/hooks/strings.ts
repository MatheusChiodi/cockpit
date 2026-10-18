const en = {
  told: (detail: string, path: string) => `loose-equality-note: loose comparison (${detail}) in ${path}, Claude was told`,
}

type Strings = typeof en

const pt: Strings = {
  told: (detail, path) => `loose-equality-note: comparação frouxa (${detail}) em ${path}, o Claude foi avisado`,
}

const es: Strings = {
  told: (detail, path) => `loose-equality-note: comparación laxa (${detail}) en ${path}, se avisó a Claude`,
}

export const STRINGS = { en, pt, es }
