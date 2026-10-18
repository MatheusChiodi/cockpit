const en = {
  told: (detail: string, path: string) => `unawaited-promise-note: promise dropped (${detail}) in ${path}, Claude was told`,
}

type Strings = typeof en

const pt: Strings = {
  told: (detail, path) => `unawaited-promise-note: promise descartada (${detail}) em ${path}, o Claude foi avisado`,
}

const es: Strings = {
  told: (detail, path) => `unawaited-promise-note: promesa descartada (${detail}) en ${path}, se avisó a Claude`,
}

export const STRINGS = { en, pt, es }
