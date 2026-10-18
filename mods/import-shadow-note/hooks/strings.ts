const en = {
  told: (detail: string, path: string) => `import-shadow-note: ${detail} shadows an import in ${path}, Claude was told`,
}

type Strings = typeof en

const pt: Strings = {
  told: (detail, path) => `import-shadow-note: ${detail} esconde um import em ${path}, o Claude foi avisado`,
}

const es: Strings = {
  told: (detail, path) => `import-shadow-note: ${detail} oculta un import en ${path}, se avisó a Claude`,
}

export const STRINGS = { en, pt, es }
