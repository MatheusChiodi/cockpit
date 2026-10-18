const en = {
  told: (detail: string, path: string) => `tw-conflict-note: conflicting classes (${detail}) in ${path}, Claude was told`,
}

type Strings = typeof en

const pt: Strings = {
  told: (detail, path) => `tw-conflict-note: classes em conflito (${detail}) em ${path}, o Claude foi avisado`,
}

const es: Strings = {
  told: (detail, path) => `tw-conflict-note: clases en conflicto (${detail}) en ${path}, se avisó a Claude`,
}

export const STRINGS = { en, pt, es }
