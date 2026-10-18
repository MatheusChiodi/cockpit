const en = {
  told: (detail: string, path: string) => `state-mutation-note: state changed in place (${detail}) in ${path}, Claude was told`,
}

type Strings = typeof en

const pt: Strings = {
  told: (detail, path) => `state-mutation-note: estado alterado no lugar (${detail}) em ${path}, o Claude foi avisado`,
}

const es: Strings = {
  told: (detail, path) => `state-mutation-note: estado cambiado en el lugar (${detail}) en ${path}, se avisó a Claude`,
}

export const STRINGS = { en, pt, es }
