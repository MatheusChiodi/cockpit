const en = {
  told: (detail: string, path: string) => `effect-cleanup-note: ${detail} without cleanup in ${path}, Claude was told`,
}

type Strings = typeof en

const pt: Strings = {
  told: (detail, path) => `effect-cleanup-note: ${detail} sem limpeza em ${path}, o Claude foi avisado`,
}

const es: Strings = {
  told: (detail, path) => `effect-cleanup-note: ${detail} sin limpieza en ${path}, se avisó a Claude`,
}

export const STRINGS = { en, pt, es }
