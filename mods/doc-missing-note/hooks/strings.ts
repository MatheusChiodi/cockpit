const en = {
  told: (detail: string, path: string) => `doc-missing-note: ${detail} has no doc comment in ${path}, Claude was told`,
}

type Strings = typeof en

const pt: Strings = {
  told: (detail, path) => `doc-missing-note: ${detail} sem comentário de documentação em ${path}, o Claude foi avisado`,
}

const es: Strings = {
  told: (detail, path) => `doc-missing-note: ${detail} sin comentario de documentación en ${path}, se avisó a Claude`,
}

export const STRINGS = { en, pt, es }
