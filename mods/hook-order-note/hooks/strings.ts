const en = {
  told: (detail: string, path: string) => `hook-order-note: ${detail} in ${path}, Claude was told to move it`,
}

type Strings = typeof en

const pt: Strings = {
  told: (detail, path) => `hook-order-note: ${detail} em ${path}, o Claude foi avisado para movê-lo`,
}

const es: Strings = {
  told: (detail, path) => `hook-order-note: ${detail} en ${path}, se avisó a Claude para moverlo`,
}

export const STRINGS = { en, pt, es }
