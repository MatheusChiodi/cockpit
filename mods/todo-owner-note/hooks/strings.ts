const en = {
  told: (detail: string, path: string) => `todo-owner-note: TODO without an owner in ${path}, Claude was told`,
}

type Strings = typeof en

const pt: Strings = {
  told: (detail, path) => `todo-owner-note: TODO sem responsável em ${path}, o Claude foi avisado`,
}

const es: Strings = {
  told: (detail, path) => `todo-owner-note: TODO sin responsable en ${path}, se avisó a Claude`,
}

export const STRINGS = { en, pt, es }
